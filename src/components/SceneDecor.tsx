/** Purely decorative layers around the garden (fog, sparkles, leaves). */
export function SceneDecor() {
  return (
    <>
      <div className="fogbank" aria-hidden="true" />
      {(['s1', 's2', 's3', 's4', 's5'] as const).map((slot, i) => (
        <span key={slot} className={`pixelspark ${slot}`} aria-hidden="true">
          {i % 2 === 0 ? '✦' : '✧'}
        </span>
      ))}
      <div className="leafpix left" aria-hidden="true">
        ❀
      </div>
      <div className="leafpix right" aria-hidden="true">
        ✿
      </div>
    </>
  );
}
