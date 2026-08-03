// Editor renderer styles — article bodies are SSR'd via EditorContentHTML, so
// the `.editor-content` / `.at-prose--renderer` rules must be present on the
// article route (previously imported globally from the ROOT layout, which
// wasted ~113KB render-blocking CSS on every non-article page).
import '@/components/Editor1/styles/index.scss';

export default function SinglePostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <main>{children}</main>
    </div>
  );
}
