import Link from 'next/link';

export default function SliderStubborn() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center p-8">
      <Link href="/" className="absolute top-8 left-8 text-white hover:text-pink-200 underline">
        ← Back to Home
      </Link>

      <div className="max-w-2xl bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20">
        <h1 className="text-4xl font-bold text-white mb-6">Slider Stubborn</h1>

        <div className="text-pink-100 space-y-4 mb-8">
          <p className="text-lg">
            A slider that <strong>stretches</strong> and resists your attempts to move it, with elastic physics.
          </p>

          <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-500/50">
            <h3 className="text-xl font-semibold mb-2">Original Features:</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Elastic stretching effect when dragged</li>
              <li>Thumb elongates and resists movement</li>
              <li>Disabled ranges that block movement</li>
              <li>Visual feedback with cursor changes (grab/grabbing)</li>
              <li>Smooth spring-like animations</li>
              <li>Step-by-step value progression</li>
            </ul>
          </div>

          <div className="bg-pink-900/30 p-4 rounded-lg border border-pink-500/50">
            <h3 className="text-xl font-semibold mb-2">Technical Requirements:</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>VueUse composables (useElementSize, useMousePressed)</li>
              <li>Custom useMouseInElement composable</li>
              <li>Remeda clamp utility</li>
              <li>Custom slider-stubborn-thumb component with stretch logic</li>
              <li>Complex dragging direction and disabled range calculations</li>
            </ul>
          </div>

          <p className="text-yellow-300 bg-yellow-900/20 p-3 rounded border border-yellow-500/30">
            <strong>Note:</strong> This Vue component uses advanced mouse tracking and element manipulation that requires exact Vue composable behavior. Original source in the <code className="bg-black/30 px-2 py-1 rounded">slider-stubborn</code> folder.
          </p>
        </div>

        <div className="flex gap-4">
          <Link
            href="/"
            className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg border border-white/30 transition-colors"
          >
            Back to Gallery
          </Link>
        </div>
      </div>
    </div>
  );
}
