import GalleryComponentPage, {
  generateStaticParams,
} from "@/app/(design-system)/components/[slug]/page"
import { getExample } from "@/lib/examples"

export { generateStaticParams }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return { title: getExample(slug)?.title ?? "Not found" }
}

export default GalleryComponentPage
