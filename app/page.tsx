
import { Hero } from "@/components/hero";
import { ThemeSwitcher } from "@/components/theme-switcher";


export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
       
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5 w-full items-center justify-center">
          <Hero />
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-6">
          <p>
            Powered by{" "}
            <a
              href="https://virtualxcellence.com/"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Virtual Xcellence
            </a>
          </p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
