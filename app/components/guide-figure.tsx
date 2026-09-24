import { normalizeSourceUrl } from '../content/reader';
import type { Figure } from '../content/types';
import { ImageViewer } from './image-viewer';

type Props = {
  figure: Figure;
  sourceLinks: Record<string, string>;
};

export function GuideFigure({ figure, sourceLinks }: Props): React.JSX.Element {
  const src = normalizeSourceUrl(figure.src);

  return (
    <figure id={figure.id} className="guide-figure">
      {src ? (
        <img
          src={src}
          alt={figure.alt}
          width={figure.width}
          height={figure.height}
          loading="lazy"
        />
      ) : (
        <p>Image unavailable: {figure.alt}</p>
      )}
      <figcaption>{figure.caption}</figcaption>
      {src && (
        <div className="guide-figure__actions">
          <ImageViewer figure={figure} />
          <a href={src} aria-label={`Open original image: ${figure.alt}`}>
            Open original image
          </a>
        </div>
      )}
      {figure.mappings.length > 0 && (
        <dl className="guide-figure__legend" aria-label="Image annotations">
          {figure.mappings.map((mapping, index) => {
            const destinations = mapping.textSourceIds.flatMap((sourceId) => {
              const value = Object.hasOwn(sourceLinks, sourceId)
                ? sourceLinks[sourceId]
                : undefined;
              const href =
                typeof value === 'string' ? normalizeSourceUrl(value) : null;
              return href ? [{ sourceId, href }] : [];
            });
            return (
              <div key={index}>
                <dt>
                  {mapping.label}
                  {mapping.color && ` (${mapping.color})`}
                  {mapping.visualValue && `: ${mapping.visualValue}`}
                </dt>
                <dd>
                  {mapping.meaning}
                  {mapping.confidence !== 'confirmed' && (
                    <span className="guide-figure__confidence">
                      {' '}
                      ({mapping.confidence})
                    </span>
                  )}
                  {destinations.length > 0 && (
                    <span className="guide-figure__references">
                      {' '}
                      {destinations.map(({ sourceId, href }, linkIndex) => (
                        <a
                          key={`${sourceId}-${linkIndex}`}
                          href={href}
                          aria-label={`Source explanation: ${mapping.label} ${mapping.meaning}`}
                        >
                          {linkIndex === 0
                            ? 'Source explanation'
                            : `Source explanation ${linkIndex + 1}`}
                        </a>
                      ))}
                    </span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
      {figure.screenshotOnly.length > 0 && (
        <section
          className="guide-figure__screenshot-facts"
          aria-label="Facts visible only in the image"
        >
          <strong>Visible in image</strong>
          <ul>
            {figure.screenshotOnly.map((fact, index) => (
              <li key={index}>{fact}</li>
            ))}
          </ul>
        </section>
      )}
      {figure.uncertainties.length > 0 && (
        <aside className="guide-note guide-note--uncertain">
          <strong>Image uncertainty</strong>
          <ul>
            {figure.uncertainties.map((uncertainty, index) => (
              <li key={index}>{uncertainty}</li>
            ))}
          </ul>
        </aside>
      )}
    </figure>
  );
}
