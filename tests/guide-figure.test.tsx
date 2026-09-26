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
  alt: 'Gear stat screenshot',
};

it('renders the placed image at its original dimensions inside a viewer button', () => {
  const blocks: Block[] = [
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
      sourceLinks={{}}
    />,
  );
  const placement = container.querySelector('#figure-placement');
  expect(placement).toBeInTheDocument();
  const displayedFigure = within(placement as HTMLElement);
  const image = displayedFigure.getByRole('img', { name: figure.alt });
  expect(image).toHaveAttribute('width', '1840');
  expect(image).toHaveAttribute('height', '3200');
  expect(image).toHaveAttribute('loading', 'lazy');
  expect(
    displayedFigure.getByRole('button', { name: /view full-size/i }),
  ).toContainElement(image);
  expect(container.querySelectorAll('#figure005')).toHaveLength(1);
});

it('lists screenshot markers with their number, color square and a link to the explaining section', () => {
  render(
    <GuideFigure
      figure={{
        ...figure,
        annotations: [
          { label: '1', title: 'Base Stats', color: 'green', target: 'base' },
        ],
      }}
    />,
  );
  const legend = screen.getByRole('list', { name: 'Screenshot markers' });
  expect(within(legend).getByText('1')).toBeVisible();
  expect(legend.querySelector('[data-guide-color-swatch]')).toBeInTheDocument();
  expect(
    within(legend).getByRole('link', { name: 'Base Stats' }),
  ).toHaveAttribute('href', '#base');
});

it('opens a Chakra dialog and returns focus after Close and Escape', async () => {
  const user = userEvent.setup();
  const { container } = render(<GuideFigure figure={figure} />);
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
  render(<GuideFigure figure={figure} />);
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

it('renders an icon-sized original as a plain image without the viewer', () => {
  const icon: Figure = {
    ...figure,
    id: 'figure-icon',
    width: 52,
    height: 53,
    alt: 'Small icon',
  };
  const { container } = render(<GuideFigure figure={icon} />);
  const image = screen.getByRole('img', { name: 'Small icon' });
  expect(image).toHaveAttribute('data-guide-primary-image');
  expect(image).toHaveAttribute('width', '52');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(container.querySelector('figure#figure-icon')).toContainElement(image);
});
