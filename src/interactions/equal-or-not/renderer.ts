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
  // Ensure the host can position the DOM-mirror buttons absolutely over the canvas.
  const previousPosition = container.style.position;
  if (!previousPosition || previousPosition === 'static') {
    container.style.position = 'relative';
  }
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

  // Track DOM mirror buttons so cleanup can remove them.
  const mirrors: HTMLButtonElement[] = [];

  // Create buttons for equal/not equal
  const equalButton = createButton(container, mirrors, 'Equal', 100, 300, () => {
    onAnswer({ choice: 'equal' });
  });
  app.stage.addChild(equalButton);

  const notEqualButton = createButton(container, mirrors, 'Not Equal', 300, 300, () => {
    onAnswer({ choice: 'not_equal' });
  });
  app.stage.addChild(notEqualButton);

  // Cleanup function
  const cleanup = () => {
    for (const mirror of mirrors) {
      if (mirror.parentNode) {
        mirror.parentNode.removeChild(mirror);
      }
    }
    mirrors.length = 0;
    app.destroy(true);
    container.removeChild(canvas);
    container.style.position = previousPosition;
  };

  return { cleanup };
}

function createButton(
  host: HTMLElement,
  mirrors: HTMLButtonElement[],
  label: string,
  x: number,
  y: number,
  onClick: () => void
) {
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

  // DOM-mirror button: gives the Pixi control a real keyboard- and AT-accessible
  // sibling that lives in document tab order. Positioned over the Pixi hit area.
  const mirror = document.createElement('button');
  mirror.type = 'button';
  mirror.textContent = label;
  mirror.setAttribute('aria-label', label);
  mirror.style.position = 'absolute';
  mirror.style.left = `${x}px`;
  mirror.style.top = `${y}px`;
  mirror.style.width = '120px';
  mirror.style.height = '50px';
  mirror.style.margin = '0';
  mirror.style.padding = '0';
  mirror.style.background = 'transparent';
  mirror.style.color = 'transparent';
  mirror.style.border = '0';
  mirror.style.cursor = 'pointer';
  mirror.style.font = 'inherit';
  // Visible focus indicator for keyboard users.
  mirror.addEventListener('focus', () => {
    mirror.style.outline = '3px solid #ffbf00';
    mirror.style.outlineOffset = '2px';
  });
  mirror.addEventListener('blur', () => {
    mirror.style.outline = 'none';
  });
  mirror.addEventListener('click', () => {
    onClick();
  });
  mirror.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      onClick();
    }
  });
  host.appendChild(mirror);
  mirrors.push(mirror);

  return button;
}
