import { render, screen, waitFor, within } from './render';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
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
  readerNotes: {
    details: ['The displayed 24% roll is an example, not a universal target.'],
    caveats: ['The cropped amount cannot be confirmed from this image.'],
  },
};

const sourceLinks = {
  block0051: '/articles/gear#enhancement',
  block0052: '/articles/gear#soul-binding',
  block0053: '/articles/gear#cropped-value',
};

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
  expect(displayedFigure.getAllByRole('term')[0]).toHaveTextContent(
    '1Enhancement and amplification',
  );
  expect(displayedFigure.getAllByRole('term')[1]).toHaveTextContent(
    '4Soul Binding',
  );
  expect(displayedFigure.getByText('green')).toBeVisible();
  expect(displayedFigure.getByText('purple')).toBeVisible();
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
    displayedFigure.queryByRole('link', { name: /open original image/i }),
  ).not.toBeInTheDocument();
  expect(
    displayedFigure.getByRole('button', { name: /view full-size/i }),
  ).toContainElement(image);
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

it('opens a Chakra dialog and returns focus after Close and Escape', async () => {
  const user = userEvent.setup();
  const { container } = render(
    <GuideFigure figure={figure} sourceLinks={sourceLinks} />,
  );
  const open = screen.getByRole('button', { name: /view full-size/i });

  await user.click(within(open).getByRole('img'));
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toBeVisible();
  expect(
    within(dialog).queryByRole('link', { name: /open original image/i }),
  ).not.toBeInTheDocument();
  expect(within(dialog).getAllByRole('button')).toHaveLength(1);
  expect(within(dialog).getByRole('button', { name: /close/i })).toBeVisible();
  expect(within(dialog).getByRole('img', { name: figure.alt })).toBeVisible();
  expect(within(dialog).getByRole('img', { name: figure.alt })).toHaveAttribute(
    'loading',
    'lazy',
  );
  expect(container.querySelectorAll('#figure005')).toHaveLength(1);

  await user.click(within(dialog).getByRole('button', { name: /close/i }));
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
  await waitFor(() => expect(open).toHaveFocus());

  await user.click(open);
  const reopenedDialog = await screen.findByRole('dialog');
  await waitFor(() =>
    expect(reopenedDialog).toContainElement(
      document.activeElement as HTMLElement,
    ),
  );
  await user.keyboard('{Escape}');
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
  await waitFor(() => expect(open).toHaveFocus());
});

it('keeps Tab and Shift+Tab within the viewer and exposes keyboard image scrolling', async () => {
  const user = userEvent.setup();
  render(<GuideFigure figure={figure} sourceLinks={sourceLinks} />);
  await user.click(screen.getByRole('button', { name: /view full-size/i }));
  const dialog = await screen.findByRole('dialog');
  const first = within(dialog).getByRole('button', {
    name: /close image/i,
  });
  const scroller = within(dialog).getByRole('region', {
    name: /scroll full-size image/i,
  });
  expect(scroller).toHaveAttribute('tabindex', '0');
  scroller.focus();
  await user.tab();
  expect(dialog).toContainElement(document.activeElement as HTMLElement);
  first.focus();
  await user.tab({ shift: true });
  expect(dialog).toContainElement(document.activeElement as HTMLElement);
});

it('keeps extraction instructions out of the rendered figure and search text', async () => {
  const { figureById, getPage } = await import('../app/content/repository');
  const { pageText } = await import('../app/content/reader');
  const sourceFigure = figureById['figure-003'];
  const { container } = render(
    <GuideFigure figure={sourceFigure} sourceLinks={{}} />,
  );
  expect(container).not.toHaveTextContent('HTML viewport');
  expect(container).not.toHaveTextContent('Do not reconstruct');
  expect(container).toHaveTextContent('Select an item and Source');
  expect(
    pageText(getPage('gear-anatomy-and-stat-layers')!, [sourceFigure]),
  ).not.toMatch(/HTML viewport|Do not reconstruct/);
  expect(sourceFigure.screenshotOnly.join(' ')).toContain('HTML viewport');
});

it('keeps regional restrictions visible when audit instructions are removed', async () => {
  const { figureById } = await import('../app/content/repository');
  const { container } = render(
    <GuideFigure figure={figureById['figure-075']} sourceLinks={{}} />,
  );
  expect(container).not.toHaveTextContent('do not use');
  expect(container).toHaveTextContent('Asia');
  expect(container).toHaveTextContent('Global');
});
