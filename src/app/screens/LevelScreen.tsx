import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { EqualOrNotRenderer } from '@interactions/equal-or-not/EqualOrNotRenderer';

interface LevelScreenProps {
  params: { levelId: string };
}

interface AnswerPayload {
  choice: 'equal' | 'not_equal';
}

export function LevelScreen({ params }: LevelScreenProps) {
  const [isActive] = useRoute('/level/:levelId');
  const levelId = params?.levelId;
  const [answer, setAnswer] = useState<AnswerPayload | null>(null);

  if (!levelId) {
    return <div>No level selected</div>;
  }

  // Phase 1: Mock question for equal_or_not spike
  const mockQuestion = {
    id: 'eq-1',
    leftFraction: { numerator: 1, denominator: 2 },
    rightFraction: { numerator: 2, denominator: 4 },
  };

  const handleAnswer = (payload: AnswerPayload) => {
    setAnswer(payload);
    console.log('Answer:', payload);
    // Phase 2: Call validator and update progression
  };

  return (
    <div className="level-screen">
      <h2>Level {levelId}</h2>
      <div id="interaction-canvas">
        <EqualOrNotRenderer question={mockQuestion} onAnswer={handleAnswer} />
      </div>
      {answer && (
        <div className="feedback">
          <p>Choice: {answer.choice}</p>
        </div>
      )}
    </div>
  );
}
