import Link from "next/link";

const features = [
  {
    title: "Built for CBSE Class 10 & 12",
    body: "Chapters explained in line with the NCERT syllabus, pitched to your class and how confident you already feel."
  },
  {
    title: "Taught through what you love",
    body: "Cricket, gaming, movies, music — your AI teacher turns your interests into analogies that make concepts click."
  },
  {
    title: "Your persona, your teacher",
    body: "Answer a few quick questions once. Pick a teaching style, a teacher's vibe, and English, Hindi or Hinglish."
  },
  {
    title: "Read online, listen, or export PDF",
    body: "Every chapter renders as a clean lesson with examples, exam-style questions, revision notes — read aloud or save as PDF."
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
          CBSE chapters, explained the way <span className="text-brand-600">you</span> think.
        </h1>
        <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
          Tell us your class, subject and interests. Your AI teacher explains any
          Class 10 or Class 12 chapter simply — with analogies and examples drawn
          from things you actually enjoy. Plus quizzes, a doubt-chat, and a saved library.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center rounded-lg bg-brand-600 px-5 py-3 text-white font-semibold hover:bg-brand-700 transition"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg bg-white px-5 py-3 text-slate-700 font-semibold border border-slate-200 hover:bg-slate-100 transition"
          >
            Sign in
          </Link>
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
        Free to use. Create an account to save your lessons, quizzes and progress.
      </footer>
    </main>
  );
}
