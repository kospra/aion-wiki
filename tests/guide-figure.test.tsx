import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { GuideFigure } from '../app/components/guide-figure';
import { RichContent } from '../app/components/rich-content';
import type { Block, Figure } from '../app/content/types';

const figure: Figure = {
  id: 'figure005',
  sourceId: 'block0050',
  src: '/images/guide/original-gear.png',
  sha256: 'fixture',
  width: 1840,
  height: 3200,
  alt: 'Gear stat screenshot with numbered green and purple annotations',
  caption: 'Gear stat layers in the source example',
  mappings: [
    {
      label: '1',
      color: 'green',
      meaning: 'Enhancement and amplification',
      textSourceIds: ['block0051'],
      confidence: 'confirmed',
    },
    {
      label: '4',
      color: 'purple',
      meaning: 'Soul Binding',
      textSourceIds: ['block0052'],
      confidence: 'confirmed',
    },
    {
      label: 'Cropped value',
      visualValue: 'unreadable',
      meaning: 'The source image cuts off the amount',
      textSourceIds: ['block0053'],
      confidence: 'unresolved',
    },
  ],
  screenshotOnly: [
    'The displayed 24% roll is an example, not a universal target.',
  ],
  uncertainties: ['The cropped amount cannot be confirmed from this image.'],
};

const sourceLinks = {
  block0051: '/articles/gear#enhancement',
  block0052: '/articles/gear#soul-binding',
  block0053: '/articles/gear#cropped-value',
};

const originalShowModal = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
);

function installDialogMethods() {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });
}

afterEach(() => {
  for (const [name, descriptor] of [
    ['showModal', originalShowModal],
    ['close', originalClose],
  ] as const) {
    if (descriptor)
      Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});

it('shows numbered color meanings, linked explanations, cropped values, and screenshot caveats beside the image', () => {
  const blocks: Block[] = [
    {
      id: 'enhancement',
      sourceIds: ['block0051'],
      kind: 'heading',
      level: 2,
      content: [{ text: 'Enhancement' }],
    },
    {
      id: 'soul-binding',
      sourceIds: ['block0052'],
      kind: 'heading',
      level: 2,
      content: [{ text: 'Soul Binding' }],
    },
    {
      id: 'cropped-value',
      sourceIds: ['block0053'],
      kind: 'heading',
      level: 2,
      content: [{ text: 'Cropped value' }],
    },
    {
      id: 'figure-placement',
      sourceIds: ['block0050'],
      kind: 'figure',
      figureId: figure.id,
    },
  ];
  const { container } = render(
    <RichContent
      blocks={blocks}
      figures={{ [figure.id]: figure }}
      sourceLinks={sourceLinks}
    />,
  );
  const placement = container.querySelector('#figure-placement');
  expect(placement).toBeInTheDocument();
  const displayedFigure = within(placement as HTMLElement);

  expect(placement?.querySelector('figcaption')).toHaveTextContent(
    figure.caption,
  );
  expect(displayedFigure.getByText(/1.*green/i)).toBeVisible();
  expect(displayedFigure.getByText(/4.*purple/i)).toBeVisible();
  expect(
    displayedFigure.getByText('Enhancement and amplification'),
  ).toBeVisible();
  expect(displayedFigure.getByText('Soul Binding')).toBeVisible();
  expect(displayedFigure.getByText(/unreadable/i)).toBeVisible();
  expect(displayedFigure.getByText(/unresolved/i)).toBeVisible();
  expect(displayedFigure.getByText(/not a universal target/i)).toBeVisible();
  expect(displayedFigure.getByText(/cannot be confirmed/i)).toBeVisible();

  for (const target of ['#enhancement', '#soul-binding', '#cropped-value']) {
    const link = displayedFigure.getByRole('link', {
      name: new RegExp(
        `source explanation.*${target.slice(1).replace('-', ' ')}`,
        'i',
      ),
    });
    expect(link).toHaveAttribute('href', `/articles/gear${target}`);
    expect(container.querySelector(target)).toBeInTheDocument();
  }
  const image = displayedFigure.getByRole('img', { name: figure.alt });
  expect(image).toHaveAttribute('width', '1840');
  expect(image).toHaveAttribute('height', '3200');
  expect(image).toHaveAttribute('loading', 'lazy');
  expect(
    displayedFigure.getByRole('link', { name: /open original image/i }),
  ).toHaveAttribute('href', figure.src);
  expect(container.querySelectorAll('#figure005')).toHaveLength(1);
});

it('ignores inherited and unsafe source-link values without losing the mapping text', () => {
  render(
    <GuideFigure
      figure={{
        ...figure,
        mappings: [
          {
            ...figure.mappings[0],
            textSourceIds: ['constructor', '__proto__', 'unsafe', 'block0051'],
          },
        ],
      }}
      sourceLinks={{ ...sourceLinks, unsafe: 'javascript:alert(1)' }}
    />,
  );
  expect(screen.getByText('Enhancement and amplification')).toBeVisible();
  expect(
    screen.getAllByRole('link', { name: /source explanation/i }),
  ).toHaveLength(1);
  expect(
    screen.getByRole('link', { name: /source explanation/i }),
  ).toHaveAttribute('href', '/articles/gear#enhancement');
});

it('opens a native dialog and returns focus on close button and cancel', async () => {
  installDialogMethods();
  const user = userEvent.setup();
  const { container } = render(
    <GuideFigure figure={figure} sourceLinks={sourceLinks} />,
  );
  const open = screen.getByRole('button', { name: /view full-size/i });

  await user.click(open);
  let dialog = screen.getByRole('dialog');
  expect(dialog).toBeVisible();
  expect(
    within(dialog).getByRole('link', { name: /open original image/i }),
  ).toHaveAttribute('href', figure.src);
  expect(within(dialog).getByRole('button', { name: /close/i })).toBeVisible();
  expect(within(dialog).getByRole('img', { name: figure.alt })).toBeVisible();
  expect(within(dialog).getByRole('img', { name: figure.alt })).toHaveAttribute(
    'loading',
    'lazy',
  );
  expect(container.querySelectorAll('#figure005')).toHaveLength(1);

  await user.click(within(dialog).getByRole('button', { name: /close/i }));
  expect(dialog).not.toHaveAttribute('open');
  expect(open).toHaveFocus();

  await user.click(open);
  dialog = screen.getByRole('dialog');
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(dialog).not.toHaveAttribute('open');
  expect(open).toHaveFocus();
});
