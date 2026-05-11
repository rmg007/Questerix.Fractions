import { useState, useMemo, type CSSProperties } from 'react';
import { useRoute } from 'wouter';
import { EqualOrNotRenderer } from '@interactions/equal-or-not/EqualOrNotRenderer';
import { useCurriculum } from '../hooks/useCurriculum';

interface LevelScreenProps {
  params: { levelId: string };
}

interface AnswerPayload {
  choice: 'equal' | 'not_equal';
}

// 44×44 minimum tap target (WCAG 2.1 AA / project a11y rule).
const buttonStyle: CSSProperties = {
  minWidth: 44,
  minHeight: 44,
  padding: '8px 16px',
};

export function LevelScreen({ params }: LevelScreenProps) {
  useRoute('/level/:levelId');
  const levelId = params?.levelId;
  const [answer, setAnswer] = useState<AnswerPayload | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);

  const { loading, templatesByArchetype } = useCurriculum();

  // Get all equal_or_not questions for this level
  const questionsForLevel = useMemo(() => {
    const allEqualOrNot = templatesByArchetype('equal_or_not');
    return allEqualOrNot.filter((q) => q.levelGroup === levelId);
  }, [levelId, templatesByArchetype]);

  const currentQuestion = questionsForLevel[questionIndex];

  if (!levelId) {
    return <div>No level selected</div>;
  }

  if (loading) {
    return (
      <div className="level-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="level-screen">
        <h2>Level {levelId}</h2>
        <p>No questions available for this level</p>
      </div>
    );
  }

  const handleAnswer = (payload: AnswerPayload) => {
    setAnswer(payload);
    console.log('Answer:', payload);
    // Phase 2: Call validator and update progression
  };

  const handleNext = () => {
    if (questionIndex < questionsForLevel.length - 1) {
      setQuestionIndex(questionIndex + 1);
      setAnswer(null);
    }
  };

  return (
    <div className="level-screen">
      <style>{`
        .level-screen button:focus-visible {
          outline: 3px solid #2563eb;
          outline-offset: 2px;
        }
      `}</style>
      <h2>
        Level {levelId} - Question {questionIndex + 1} of {questionsForLevel.length}
      </h2>
      <div id="interaction-canvas">
        <EqualOrNotRenderer question={currentQuestion.payload as any} onAnswer={handleAnswer} />
      </div>
      {answer && (
        <div className="feedback">
          <p>Choice: {answer.choice}</p>
          {questionIndex < questionsForLevel.length - 1 && (
            <button style={buttonStyle} onClick={handleNext}>
              Next Question
            </button>
          )}
        </div>
      )}
    </div>
  );
}
