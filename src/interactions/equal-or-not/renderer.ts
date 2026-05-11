import * as PIXI from 'pixi.js';

interface Question {
  id: string;
  leftFraction: { numerator: number; denominator: number };
  rightFraction: { numerator: number; denominator: number };
}

interface AnswerPayload {
  choice: 'equal' | 'not_equal';
}

export function createEqualOrNotCanvas(
  container: HTMLElement,
  question: Question,
  onAnswer: (payload: AnswerPayload) => void
) {
  // Phase 1: Minimal Pixi canvas setup
  const canvas = document.createElement('canvas');
  canvas.width = container.clientWidth || 500;
  canvas.height = container.clientHeight || 400;
  container.appendChild(canvas);

  // Create a Pixi Application
  const app = new PIXI.Application({
    canvas,
    width: canvas.width,
    height: canvas.height,
    backgroundColor: 0xffffff,
  });

  // Create simple text labels for the fractions
  const leftText = new PIXI.Text(
    `${question.leftFraction.numerator}/${question.leftFraction.denominator}`,
    { fontSize: 40, fill: 0x000000 }
  );
  leftText.position.set(50, 150);
  app.stage.addChild(leftText);

  const rightText = new PIXI.Text(
    `${question.rightFraction.numerator}/${question.rightFraction.denominator}`,
    { fontSize: 40, fill: 0x000000 }
  );
  rightText.position.set(300, 150);
  app.stage.addChild(rightText);

  // Create buttons for equal/not equal
  const equalButton = createButton('Equal', 100, 300, () => {
    onAnswer({ choice: 'equal' });
  });
  app.stage.addChild(equalButton);

  const notEqualButton = createButton('Not Equal', 300, 300, () => {
    onAnswer({ choice: 'not_equal' });
  });
  app.stage.addChild(notEqualButton);

  // Cleanup function
  const cleanup = () => {
    app.destroy(true);
    container.removeChild(canvas);
  };

  return { cleanup };
}

function createButton(label: string, x: number, y: number, onClick: () => void) {
  const button = new PIXI.Container();
  button.position.set(x, y);
  button.interactive = true;
  button.hitArea = new PIXI.Rectangle(0, 0, 120, 50);
  button.on('pointerdown', onClick);

  const bg = new PIXI.Graphics();
  bg.rect(0, 0, 120, 50);
  bg.fill(0x2f6fed);
  button.addChild(bg);

  const text = new PIXI.Text(label, { fontSize: 16, fill: 0xffffff });
  text.position.set(10, 15);
  button.addChild(text);

  return button;
}
