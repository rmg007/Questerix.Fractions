import { useEffect, useRef } from 'react';
import { createEqualOrNotCanvas } from './renderer';

interface EqualOrNotQuestion {
  id: string;
  leftFraction: { numerator: number; denominator: number };
  rightFraction: { numerator: number; denominator: number };
}

interface EqualOrNotAnswer {
  choice: 'equal' | 'not_equal';
}

interface EqualOrNotRendererProps {
  question: EqualOrNotQuestion;
  onAnswer: (payload: EqualOrNotAnswer) => void;
}

export function EqualOrNotRenderer({ question, onAnswer }: EqualOrNotRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const { cleanup } = createEqualOrNotCanvas(containerRef.current, question, onAnswer);

    return cleanup;
  }, [question, onAnswer]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '400px',
        border: '1px solid #ccc',
        backgroundColor: '#f9f9f9',
        position: 'relative',
      }}
    />
  );
}
