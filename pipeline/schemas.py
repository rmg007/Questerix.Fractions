"""
Pydantic v2 models mirroring src/types/entities.ts static entities.
per data-schema.md §2, content-pipeline.md §6.2
All models use strict mode (extra='forbid') to catch schema drift early.
"""
from __future__ import annotations

from typing import Literal, Optional, Union
from pydantic import BaseModel, Field, field_validator, model_validator

# ── Archetype enum (mirrors src/types/archetype.ts) ──────────────────────────
# per data-schema.md §2.7 (audit §1.5 fix)
ARCHETYPES = (
    "partition",
    "identify",
    "label",
    "make",
    "compare",
    "benchmark",
    "order",
    "snap_match",
    "equal_or_not",
    "placement",
)
ArchetypeId = Literal[
    "partition", "identify", "label", "make", "compare",
    "benchmark", "order", "snap_match", "equal_or_not", "placement",
]

# ── §2.3 Skill ────────────────────────────────────────────────────────────────

class BktParams(BaseModel, frozen=True, extra="forbid"):
    """Bayesian Knowledge Tracing priors. per data-schema.md §2.3"""
    pInit: float = Field(ge=0.0, le=1.0)
    pTransit: float = Field(ge=0.0, le=1.0)
    pSlip: float = Field(ge=0.0, le=1.0)
    pGuess: float = Field(ge=0.0, le=1.0)


class Skill(BaseModel, frozen=True, extra="forbid"):
    """per data-schema.md §2.3"""
    id: str = Field(pattern=r"^SK-\d{2}$")
    name: str
    description: str
    gradeLevel: Literal[0, 1, 2]
    prerequisites: list[str]
    standardIds: list[str]
    bktParams: BktParams


# ── §2.4 Activity ─────────────────────────────────────────────────────────────

class UnlockRule(BaseModel, frozen=True, extra="forbid"):
    requiredSkillIds: list[str]
    minMasteryEstimate: float = Field(ge=0.0, le=1.0)


class Activity(BaseModel, frozen=True, extra="forbid"):
    """per data-schema.md §2.4"""
    id: str
    title: str
    gradeBand: list[Literal["K", "1", "2"]]
    levelGroup: Literal["01-02", "03-05", "06-09"]
    skillIds: list[str]
    unlockRule: Optional[UnlockRule]
    isCore: bool
    archetype: ArchetypeId  # (audit §1.5 fix — replaces mechanic/type)


# ── §2.5 ActivityLevel ────────────────────────────────────────────────────────

class DifficultyConfig(BaseModel, frozen=True, extra="forbid"):
    timerSeconds: Optional[float]
    hintsAllowed: bool
    tolerance: float = Field(ge=0.0, le=1.0)
    problemCount: int = Field(ge=1)


class AdvanceCriteria(BaseModel, frozen=True, extra="forbid"):
    minAccuracy: float = Field(ge=0.0, le=1.0)
    minProblems: int = Field(ge=1)
    maxAvgHints: float = Field(ge=0.0)


class ActivityLevel(BaseModel, frozen=True, extra="forbid"):
    """per data-schema.md §2.5"""
    id: str
    activityId: str
    levelNumber: int = Field(ge=1, le=9)
    scaffoldLevel: Literal[1, 2, 3, 4, 5]
    fractionPoolIds: list[str]
    questionTemplateIds: list[str]
    difficultyConfig: DifficultyConfig
    advanceCriteria: AdvanceCriteria


# ── §2.6 FractionBank ─────────────────────────────────────────────────────────

class VisualAssets(BaseModel, extra="forbid"):
    barUrl: Optional[str] = None
    circleUrl: Optional[str] = None
    setUrl: Optional[str] = None


class FractionBank(BaseModel, frozen=True, extra="forbid"):
    """per data-schema.md §2.6"""
    id: str = Field(pattern=r"^frac:\d+/\d+$")
    numerator: int = Field(ge=0)
    denominator: int = Field(ge=1)
    decimalValue: float
    benchmark: Literal["zero", "almost_zero", "almost_half", "half", "almost_one", "one"]
    denominatorFamily: Literal["halves", "thirds", "fourths", "sixths", "eighths"]
    visualAssets: VisualAssets = Field(default_factory=VisualAssets)

    @model_validator(mode="after")
    def decimal_consistent(self) -> "FractionBank":
        expected = self.numerator / self.denominator
        if abs(self.decimalValue - expected) > 1e-9:
            raise ValueError(
                f"decimalValue {self.decimalValue} inconsistent with {self.numerator}/{self.denominator}"
            )
        return self


# ── §2.7 QuestionTemplate ─────────────────────────────────────────────────────

class QuestionPrompt(BaseModel, frozen=True, extra="forbid"):
    text: str = Field(min_length=1)
    ttsKey: str = Field(min_length=1)
    localeStrings: Optional[dict[str, str]] = None


class QuestionTemplate(BaseModel, extra="forbid"):
    """
    per data-schema.md §2.7
    id format: 'q:<archetype-short>:L{N}:NNNN'
    archetype replaces old type/mechanic fields (audit §1.5 fix)
    NOTE: 'type' and 'mechanic' fields are FORBIDDEN (audit §1.5 fix).
    """
    id: str = Field(pattern=r"^q:[a-z_]+:L\d+:\d{4}$")
    archetype: ArchetypeId
    prompt: QuestionPrompt
    payload: dict  # shape varies per archetype; validated by archetype validators
    correctAnswer: Union[float, bool, int, str, list, dict]
    validatorId: str = Field(pattern=r"^validator\.[a-z_]+\.[a-zA-Z0-9]+$")
    skillIds: list[str] = Field(min_length=1)
    misconceptionTraps: list[str]
    difficultyTier: Literal["easy", "medium", "hard"]

    @field_validator("skillIds")
    @classmethod
    def skill_ids_format(cls, v: list[str]) -> list[str]:
        for sid in v:
            if not (sid.startswith("SK-") or sid.startswith("skill:")):
                raise ValueError(f"skillId must start with 'SK-' or 'skill:': {sid}")
        return v

    @field_validator("misconceptionTraps")
    @classmethod
    def misconception_ids_format(cls, v: list[str]) -> list[str]:
        for mid in v:
            if not mid.startswith("MC-"):
                raise ValueError(f"misconceptionId must start with 'MC-': {mid}")
        return v


# ── §2.8 Misconception ────────────────────────────────────────────────────────

class DetectionPattern(BaseModel, frozen=True, extra="forbid"):
    signalType: str
    rule: str


class Misconception(BaseModel, frozen=True, extra="forbid"):
    """per data-schema.md §2.8"""
    id: str = Field(pattern=r"^MC-")
    name: str
    description: str
    detectionPattern: DetectionPattern
    interventionActivityIds: list[str]
    gradeLevel: list[Literal[0, 1, 2]]


# ── §2.9 HintTemplate ────────────────────────────────────────────────────────

class HintContent(BaseModel, extra="forbid"):
    text: Optional[str] = None
    assetUrl: Optional[str] = None
    ttsKey: Optional[str] = None


class HintTemplate(BaseModel, frozen=True, extra="forbid"):
    """per data-schema.md §2.9 (audit §2.1 fix)"""
    id: str
    questionTemplateId: str
    type: Literal["verbal", "visual_overlay", "worked_example"]
    order: Literal[1, 2, 3]
    content: HintContent
    pointCost: float = Field(ge=0.0)


# ── ValidatorSpec ─────────────────────────────────────────────────────────────

class ValidatorSpec(BaseModel, frozen=True, extra="forbid"):
    """
    Registration metadata for a validator.
    per data-schema.md §2.7 / activity-archetypes.md §11 (audit §2.2 fix)
    id format: 'validator.<archetype>.<variant>'
    """
    id: str = Field(pattern=r"^validator\.[a-z_]+\.[a-zA-Z0-9]+$")
    archetype: ArchetypeId
    variant: str
    description: str


# ── CurriculumPack (seed file root) ──────────────────────────────────────────

class CurriculumPack(BaseModel, frozen=True, extra="forbid"):
    """per data-schema.md §2.1"""
    id: str
    schemaVersion: int = Field(ge=1)
    contentVersion: str = Field(pattern=r"^\d+\.\d+\.\d+$")
    gradeBand: Literal["K", "1", "2", "K-2"]
    publishedAt: str  # ISO date
    locales: list[str] = Field(min_length=1)


# ── Full seed file shape ──────────────────────────────────────────────────────

class SeedFile(BaseModel, extra="forbid"):
    """
    Shape of src/assets/curriculum/v{n}.json.
    per content-pipeline.md §2.2
    """
    curriculumPacks: list[CurriculumPack]
    standards: list[dict]  # StandardsItem — informational only
    skills: list[Skill]
    activities: list[Activity]
    activityLevels: list[ActivityLevel]
    fractionBank: list[FractionBank]
    questionTemplates: list[QuestionTemplate]
    misconceptions: list[Misconception]
    hints: list[HintTemplate]

    @model_validator(mode="after")
    def template_count_in_range(self) -> "SeedFile":
        # per content-pipeline.md §1 — target ~300-340 templates (audit §2.5 fix)
        n = len(self.questionTemplates)
        if n > 0 and not (300 <= n <= 340):
            # warn but don't hard-fail — partial builds are valid during iteration
            import warnings
            warnings.warn(
                f"questionTemplates count {n} outside target range 300-340 (audit §2.5 fix)",
                stacklevel=2,
            )
        return self
