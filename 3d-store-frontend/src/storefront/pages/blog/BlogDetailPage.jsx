import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft, FiCheck, FiClock, FiCalendar } from 'react-icons/fi'
import SEO from '../../../components/SEO'
import { POSTS, GUIDES, findPost, findGuide, buildSections, buildChecklist } from '../../blog/blogData'
import NotFoundPage from '../NotFoundPage'
import { PostCover } from './BlogPage'
import '../../storefront.css'
import './Blog.css'

const Checklist = ({ items }) => (
  <section className="sf-article-check sf-cut">
    <h2>Kontrol listesi</h2>
    <ul>
      {items.map((item) => <li key={item}><FiCheck aria-hidden="true" /> {item}</li>)}
    </ul>
  </section>
)

const BlogDetailPage = () => {
  const { slug } = useParams()
  const guide = findGuide(slug)
  const post = guide ? null : findPost(slug)

  if (!guide && !post) return <NotFoundPage />

  // Rehber: tam metin. Yazı: başlık ve özetten üretilen çerçeve (bkz. blogData.js)
  const article = guide
    ? {
        title: guide.title.replace(/^\d+\.\s*/, ''),
        lead: guide.intro,
        label: 'Rehber',
        sections: [{ title: null, paragraphs: guide.paragraphs }],
        checklist: guide.checklist,
        takeaway: guide.takeaway,
      }
    : {
        title: post.title,
        lead: post.excerpt,
        label: post.category,
        meta: post,
        sections: post.sections || buildSections(post),
        checklist: post.checklist || buildChecklist(post),
      }

  const related = guide
    ? GUIDES.filter((g) => g.id !== guide.id).slice(0, 3).map((g) => ({ id: g.id, title: g.title.replace(/^\d+\.\s*/, ''), label: 'Rehber' }))
    : POSTS.filter((p) => p.id !== post.id && p.category === post.category)
      .concat(POSTS.filter((p) => p.id !== post.id && p.category !== post.category))
      .slice(0, 3)
      .map((p) => ({ id: p.id, title: p.title, label: p.category }))

  return (
    <div className="sf-root sf-page sf-article">
      <SEO title={article.title} description={article.lead} url={`/blog/${slug}`} type="article" />
      <div className="sf-container sf-article-wrap">
        <Link to="/blog" className="sf-article-back"><FiArrowLeft aria-hidden="true" /> Blog</Link>

        <header className="sf-article-head">
          <span className="sf-cut-tag sf-cut-tag--soft">{article.label}</span>
          <h1>{article.title}</h1>
          <p className="sf-article-lead">{article.lead}</p>
          {article.meta && (
            <p className="sf-article-meta">
              <span><FiClock aria-hidden="true" /> {article.meta.readTime} okuma</span>
              <span><FiCalendar aria-hidden="true" /> {article.meta.updatedAt}</span>
            </p>
          )}
        </header>

        {post && <div className="sf-article-cover"><PostCover post={post} /></div>}

        <article className="sf-article-body">
          {article.sections.map((sec, i) => (
            <section key={sec.title || i}>
              {sec.title && <h2>{sec.title}</h2>}
              {sec.paragraphs.map((para) => <p key={para}>{para}</p>)}
            </section>
          ))}

          {article.checklist?.length > 0 && <Checklist items={article.checklist} />}

          {article.takeaway && (
            <blockquote className="sf-article-takeaway">{article.takeaway}</blockquote>
          )}
        </article>

        {related.length > 0 && (
          <section className="sf-article-related" aria-labelledby="sf-related-title">
            <h2 id="sf-related-title">Devamını oku</h2>
            <ul>
              {related.map((r) => (
                <li key={r.id}>
                  <Link to={`/blog/${r.id}`}>
                    <span>{r.label}</span>
                    <strong>{r.title}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

export default BlogDetailPage
