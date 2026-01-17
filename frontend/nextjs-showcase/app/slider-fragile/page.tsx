import Link from 'next/link';

export default function SliderFragile() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-orange-900 flex items-center justify-center p-8">
      <Link href="/" className="absolute top-8 left-8 text-white hover:text-orange-200 underline">
        ← Back to Home
      </Link>

      <div className="max-w-2xl bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20">
        <h1 className="text-4xl font-bold text-white mb-6">Slider Fragile</h1>

        <div className="text-orange-100 space-y-4 mb-8">
          <p className="text-lg">
            A slider that <strong>breaks</strong> when pulled too far from its original position.
          </p>

          <div className="bg-red-900/30 p-4 rounded-lg border border-red-500/50">
            <h3 className="text-xl font-semibold mb-2">Original Features:</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Physics-based slider with joint connections</li>
              <li>Breaks when stretched beyond a threshold</li>
              <li>Visual feedback with joints and thumb separation</li>
              <li>Customizable break length and durability</li>
              <li>Smooth animations using Vue transitions</li>
            </ul>
          </div>

          <div className="bg-orange-900/30 p-4 rounded-lg border border-orange-500/50">
            <h3 className="text-xl font-semibold mb-2">Technical Requirements:</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>VueUse composables (useElementBounding, useMouseInElement)</li>
              <li>Remeda utility library</li>
              <li>Custom slider-fragile-thumb component</li>
              <li>Complex state management for break detection</li>
            </ul>
          </div>

          <p className="text-yellow-300 bg-yellow-900/20 p-3 rounded border border-yellow-500/30">
            <strong>Note:</strong> This Vue component requires complex dependencies and state management that would need significant adaptation for exact React porting. The original source is available in the <code className="bg-black/30 px-2 py-1 rounded">slider-fragile</code> folder.
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
