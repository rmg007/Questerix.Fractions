#!/usr/bin/env python3
"""
Sanity checker for Questerix Fractions backup JSON exports.

Validates that a JSON export from the app matches the expected schema
and contains no obvious corruption or missing required fields.

Usage:
    python check.py <path-to-export.json>

Exit codes:
    0 = valid
    1 = schema validation failed
    2 = data integrity issue (resolves failed, duplicates, etc.)
    3 = file not found
"""

import json
import sys
from pathlib import Path
from collections import Counter, defaultdict
from typing import Any, Dict, List, Tuple


class ValidationError(Exception):
    """Raised when validation fails."""
    pass


def load_export(filepath: str) -> Dict[str, Any]:
    """Load and parse JSON export."""
    path = Path(filepath)
    if not path.exists():
        print(f"ERROR: File not found: {filepath}")
        sys.exit(3)

    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise ValidationError(f"Invalid JSON: {e}")


def validate_schema(data: Dict[str, Any]) -> None:
    """Validate top-level schema."""
    required_keys = {
        'schemaVersion', 'contentVersion', 'exportedAt',
        'student', 'sessions', 'attempts', 'hintEvents',
        'skillMastery', 'misconceptionFlags', 'progressionStat',
        'deviceMeta'
    }

    missing = required_keys - set(data.keys())
    if missing:
        raise ValidationError(f"Missing required keys: {missing}")

    # Type checks
    if not isinstance(data['schemaVersion'], int):
        raise ValidationError(f"schemaVersion must be int, got {type(data['schemaVersion'])}")
    if not isinstance(data['contentVersion'], str):
        raise ValidationError(f"contentVersion must be str, got {type(data['contentVersion'])}")
    if not isinstance(data['exportedAt'], (int, float)):
        raise ValidationError(f"exportedAt must be numeric timestamp")
    if not isinstance(data['sessions'], list):
        raise ValidationError(f"sessions must be array")
    if not isinstance(data['attempts'], list):
        raise ValidationError(f"attempts must be array")

    print(f"✓ Schema structure valid (schemaVersion={data['schemaVersion']}, contentVersion={data['contentVersion']})")


def validate_student(student: Dict[str, Any]) -> None:
    """Validate student record."""
    required = {'id', 'displayName', 'gradeLevel', 'createdAt', 'lastActiveAt'}
    missing = required - set(student.keys())
    if missing:
        raise ValidationError(f"Student missing keys: {missing}")

    if not isinstance(student['id'], str) or not student['id'].startswith('stu_'):
        raise ValidationError(f"Student id must be stu_<uuid>, got {student['id']}")
    if not isinstance(student['displayName'], str) or len(student['displayName']) == 0:
        raise ValidationError(f"Student displayName must be non-empty string")
    if student['gradeLevel'] not in [0, 1, 2]:
        raise ValidationError(f"Student gradeLevel must be 0, 1, or 2, got {student['gradeLevel']}")

    print(f"✓ Student record valid: {student['displayName']} (grade {student['gradeLevel']})")


def validate_sessions(sessions: List[Dict[str, Any]]) -> None:
    """Validate session records."""
    if len(sessions) == 0:
        raise ValidationError("No sessions found (empty array)")

    session_ids = set()
    for i, sess in enumerate(sessions):
        required = {'id', 'studentId', 'activityId', 'levelNumber', 'startedAt', 'endedAt', 'totalAttempts', 'correctAttempts', 'accuracy', 'device'}
        missing = required - set(sess.keys())
        if missing:
            raise ValidationError(f"Session {i} missing keys: {missing}")

        if not isinstance(sess['id'], str) or not sess['id'].startswith('sess_'):
            raise ValidationError(f"Session {i} id must be sess_<uuid>, got {sess['id']}")

        if sess['id'] in session_ids:
            raise ValidationError(f"Duplicate session id: {sess['id']}")
        session_ids.add(sess['id'])

        if sess['startedAt'] > sess['endedAt']:
            raise ValidationError(f"Session {i}: startedAt ({sess['startedAt']}) > endedAt ({sess['endedAt']})")

        if not (0.0 <= sess['accuracy'] <= 1.0):
            raise ValidationError(f"Session {i}: accuracy out of range: {sess['accuracy']}")

        if sess['levelNumber'] < 1 or sess['levelNumber'] > 9:
            raise ValidationError(f"Session {i}: levelNumber out of range: {sess['levelNumber']}")

    print(f"✓ Sessions valid: {len(sessions)} sessions, all IDs unique")
    return session_ids


def validate_attempts(attempts: List[Dict[str, Any]], session_ids: set) -> None:
    """Validate attempt records."""
    if len(attempts) == 0:
        raise ValidationError("No attempts found (empty array)")

    for i, att in enumerate(attempts):
        required = {'id', 'sessionId', 'questionId', 'studentAnswer', 'isCorrect', 'responseTimeMs', 'createdAt'}
        missing = required - set(att.keys())
        if missing:
            raise ValidationError(f"Attempt {i} missing keys: {missing}")

        if att['sessionId'] not in session_ids:
            raise ValidationError(f"Attempt {i}: sessionId {att['sessionId']} does not resolve to a session")

        if not isinstance(att['isCorrect'], bool):
            raise ValidationError(f"Attempt {i}: isCorrect must be boolean, got {type(att['isCorrect'])}")

        if att['responseTimeMs'] < 0:
            raise ValidationError(f"Attempt {i}: responseTimeMs must be non-negative, got {att['responseTimeMs']}")

    print(f"✓ Attempts valid: {len(attempts)} attempts, all sessionIds resolve")


def validate_counts(sessions: List[Dict[str, Any]], attempts: List[Dict[str, Any]]) -> None:
    """Validate that session.totalAttempts matches attempt counts."""
    attempts_per_session = Counter(att['sessionId'] for att in attempts)

    for sess in sessions:
        reported = sess['totalAttempts']
        actual = attempts_per_session.get(sess['id'], 0)

        if reported != actual:
            raise ValidationError(
                f"Session {sess['id']}: reported totalAttempts={reported}, "
                f"but found {actual} Attempt records"
            )

        # Validate accuracy calculation
        correct = sum(1 for att in attempts if att['sessionId'] == sess['id'] and att['isCorrect'])
        expected_accuracy = correct / actual if actual > 0 else 0.0

        if abs(sess['accuracy'] - expected_accuracy) > 0.001:  # Allow floating point rounding
            raise ValidationError(
                f"Session {sess['id']}: reported accuracy={sess['accuracy']}, "
                f"but calculated accuracy={expected_accuracy:.3f} from attempts"
            )

    print(f"✓ Attempt counts match session records (accuracy calculations verified)")


def validate_optional_arrays(data: Dict[str, Any]) -> None:
    """Validate optional arrays (hints, skill mastery, etc.)."""
    optional_keys = ['hintEvents', 'skillMastery', 'misconceptionFlags', 'progressionStat']

    for key in optional_keys:
        if key in data:
            if not isinstance(data[key], list):
                raise ValidationError(f"{key} must be array, got {type(data[key])}")
            print(f"✓ {key}: {len(data[key])} records")


def summarize(data: Dict[str, Any]) -> None:
    """Print summary statistics."""
    print("\n" + "=" * 60)
    print("EXPORT SUMMARY")
    print("=" * 60)

    student = data['student']
    sessions = data['sessions']
    attempts = data['attempts']

    print(f"Student: {student['displayName']} (grade {student['gradeLevel']})")
    print(f"Sessions: {len(sessions)}")
    print(f"Total attempts: {len(attempts)}")

    if sessions:
        total_correct = sum(s['correctAttempts'] for s in sessions)
        overall_accuracy = total_correct / len(attempts) if attempts else 0
        print(f"Overall accuracy: {overall_accuracy:.1%} ({total_correct}/{len(attempts)})")

        min_level = min(s['levelNumber'] for s in sessions)
        max_level = max(s['levelNumber'] for s in sessions)
        print(f"Levels touched: {min_level}–{max_level}")

        activity_counts = Counter(s['activityId'] for s in sessions)
        print(f"Activities: {dict(activity_counts)}")

    print("=" * 60 + "\n")


def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <path-to-export.json>")
        sys.exit(1)

    filepath = sys.argv[1]

    try:
        data = load_export(filepath)
        validate_schema(data)
        validate_student(data['student'])
        session_ids = validate_sessions(data['sessions'])
        validate_attempts(data['attempts'], session_ids)
        validate_counts(data['sessions'], data['attempts'])
        validate_optional_arrays(data)
        summarize(data)

        print("✓ EXPORT VALID\n")
        sys.exit(0)

    except ValidationError as e:
        print(f"\n✗ VALIDATION FAILED\n{e}\n")
        sys.exit(2)
    except Exception as e:
        print(f"\n✗ UNEXPECTED ERROR\n{e}\n")
        sys.exit(2)


if __name__ == '__main__':
    main()
