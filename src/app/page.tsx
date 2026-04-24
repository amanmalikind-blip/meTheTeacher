import Link from "next/link";

const features = [
  {
    title: "Any topic, any level",
    body: "Tell us what you want to learn. We tailor depth and vocabulary to beginner, intermediate, or advanced."
  },
  {
    title: "Your teaching style",
    body: "Analogies, worked examples, Socratic questions, story-driven — pick one or let us learn yours."
  },
  {
    title: "Character & voice",
    body: "Pick a narrator character and voice. We'll read the lesson aloud in your chosen language."
  },
  {
    title: "HTML online + PDF export",
    body: "Read instantly as a web lesson, then export a clean PDF with your customisations baked in."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="text-center">
        <p className="text-brand-600 font-semibold tracking-wide uppercase text-sm">
          meTheTeacher
        </p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-bold leading-tight">
          Learn anything — taught the way <span className="text-brand-600">you</span> learn best.
        </h1>
        <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
          Five free lessons on us. Pick a topic, level, teaching style, character and voice — we
          generate a rich HTML lesson you can read online or export to a customised PDF.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link
            href="/lesson"
            className="inline-flex items-center rounded-lg bg-brand-600 px-5 py-3 text-white font-semibold hover:bg-brand-700 transition"
          >
            Start a free lesson
          </Link>
          <a
            href="#how"
            className="inline-flex items-center rounded-lg bg-white px-5 py-3 text-slate-700 font-semibold border border-slate-200 hover:bg-slate-100 transition"
          >
            How it works
          </a>
        </div>
      </header>

      <section id="how" className="mt-20 grid sm:grid-cols-2 gap-6">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl bg-white border border-slate-200 p-6 shadow-sm"
          >
            <h3 className="font-semibold text-lg text-slate-900">{f.title}</h3>
            <p className="mt-2 text-slate-600">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-20 text-center text-sm text-slate-500">
        Built for Azure. Free tier: 5 lessons, no sign-up required.
      </footer>
    </main>
  );
}
