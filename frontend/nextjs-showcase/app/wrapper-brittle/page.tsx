import Link from 'next/link';

export default function WrapperBrittle() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 flex items-center justify-center p-8">
      <Link href="/" className="absolute top-8 left-8 text-white hover:text-slate-200 underline">
        ← Back to Home
      </Link>

      <div className="max-w-2xl bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20">
        <h1 className="text-4xl font-bold text-white mb-6">Wrapper Brittle</h1>

        <div className="text-slate-100 space-y-4 mb-8">
          <p className="text-lg">
            Click on DOM elements to <strong>shatter them</strong> into pieces with physics!
          </p>

          <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-500/50">
            <h3 className="text-xl font-semibold mb-2">Original Features:</h3>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>DOM-to-Canvas conversion</strong> of wrapped content</li>
              <li>Click to shatter elements into physics-based fragments</li>
              <li>Fragments fly outward from click point</li>
              <li>Customizable split step and jitter for fragment size</li>
              <li>Configurable shatter threshold and movement distance</li>
              <li>Restore animation to reassemble fragments</li>
              <li>Uses dom-actor component for physics simulation</li>
            </ul>
          </div>

          <div className="bg-slate-900/30 p-4 rounded-lg border border-slate-500/50">
            <h3 className="text-xl font-semibold mb-2">Technical Requirements:</h3>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>DOM-to-Image conversion</strong> using custom composables</li>
              <li>Custom useDomImage composable with MutationObserver</li>
              <li>dom-actor.vue component for physics</li>
              <li>Lodash throttling</li>
              <li>Nanoid for unique keys</li>
              <li>Complex canvas manipulation and fragment generation</li>
              <li>Click count tracking and threshold system</li>
            </ul>
          </div>

          <p className="text-yellow-300 bg-yellow-900/20 p-3 rounded border border-yellow-500/30">
            <strong>Note:</strong> This component converts DOM elements to canvas, generates fragment meshes, and applies physics. It requires complex DOM observation, canvas rendering, and physics simulation. Original in <code className="bg-black/30 px-2 py-1 rounded">wrapper-brittle</code> folder.
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
