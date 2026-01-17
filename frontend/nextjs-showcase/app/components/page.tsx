import Link from "next/link";

export default function ComponentsGallery() {
  const components = [
    {
      category: "Reddit Bad UI Battles",
      description: "Intentionally terrible UI designs from r/badUIbattles",
      items: [
        { name: "Limit Username Size", href: "/limit-username", description: "Username input with trash bin deletion animation" },
        { name: "Scientific Date Picker", href: "/scientific-date-picker", description: "Orrery-style date picker with orbital mechanics" },
      ]
    },
    {
      category: "Interactive Buttons",
      description: "Buttons with unique and frustrating interaction patterns",
      items: [
        { name: "Jigsaw Puzzle Button", href: "/jigsaw-button", description: "Solve a puzzle to unlock the button" },
        { name: "Naughty Button", href: "/naughty-button", description: "Button runs away from your cursor with jelly physics" },
      ]
    },
    {
      category: "Creative CAPTCHA Systems",
      description: "Unconventional and challenging verification methods",
      items: [
        { name: "Chess CAPTCHA", href: "/chess-captcha", description: "Checkmate Stockfish to prove you're human" },
      ]
    },
    {
      category: "Bad Input Methods",
      description: "Creative ways to make data entry extremely difficult",
      items: [
        { name: "Hinge Input (Broken UI)", href: "/hinge-input", description: "Input fields that fall down as you type" },
        { name: "Delete Account Cups", href: "/delete-cups", description: "Find the delete button in a shell game" },
        { name: "Bullet Hell Phone Entry", href: "/bullet-hell", description: "Dodge bullets to enter phone number" },
      ]
    },
    {
      category: "Vue Components (Advanced)",
      description: "Complex interactive components ported from Vue",
      items: [
        { name: "Slider Fragile", href: "/slider-fragile", description: "Slider that breaks when pulled too far" },
        { name: "Slider Stubborn", href: "/slider-stubborn", description: "Slider that stretches and resists movement" },
        { name: "Text Hate Mouse", href: "/text-hate-mouse", description: "Text that runs away from cursor with physics" },
        { name: "Wrapper Brittle", href: "/wrapper-brittle", description: "Click to shatter DOM elements" },
        { name: "Real Dark Overlay", href: "/real-dark", description: "Flashlight-style dark mode with real occlusion" },
      ]
    },
    {
      category: "Terrible Loaders",
      description: "Deliberately awful loading experiences",
      items: [
        { name: "Balloon Pump Loader", href: "/loading-balloon", description: "Pump the handle to inflate progress" },
        { name: "Chaos Progress", href: "/loading-chaos", description: "Progress that stalls, jitters, and regresses" },
        { name: "Tiny Loader", href: "/loading-tiny", description: "Microscopic spinner; loads faster when unfocused" },
        { name: "Click-To-Load", href: "/loading-clicks", description: "Exactly 100 clicks required (decays if idle)" },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <Link href="/" className="inline-block mb-6 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur">
            ← Back to Dashboard
          </Link>
          <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">
            Bad UI Showcase
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto">
            A collection of intentionally terrible, creative, and frustrating user interfaces
          </p>
          <p className="text-sm text-purple-300 mt-4">
            All components implemented with exact original functionality preserved
          </p>
        </header>

        <div className="space-y-12">
          {components.map((category, idx) => (
            <div key={idx} className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <h2 className="text-3xl font-bold text-white mb-2">{category.category}</h2>
              <p className="text-purple-200 mb-6">{category.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.items.map((item, itemIdx) => (
                  <Link
                    key={itemIdx}
                    href={item.href}
                    className="group relative bg-white/5 hover:bg-white/10 backdrop-blur rounded-xl p-6 border border-white/10 hover:border-purple-400 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50"
                  >
                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-purple-200 text-sm">{item.description}</p>
                    <div className="absolute top-4 right-4 text-white/40 group-hover:text-purple-300 transition-colors">
                      →
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <footer className="text-center mt-16 text-purple-300">
          <p className="text-sm">
            All components are for educational and entertainment purposes
          </p>
          <p className="text-xs mt-2 text-purple-400">
            Exact implementations of original source code
          </p>
        </footer>
      </div>
    </div>
  );
}
