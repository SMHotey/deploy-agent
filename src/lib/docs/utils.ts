import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const DOCS_DIR = path.join(process.cwd(), 'src/docs');

export interface DocPage {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
}

export function getAllDocs(): DocPage[] {
  const files = getAllFiles(DOCS_DIR);
  return files.map((filePath) => {
    const relativePath = path.relative(DOCS_DIR, filePath);
    const slug = relativePath.replace(/\.mdx$/, '').replace(/\\/g, '/');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    return {
      slug,
      title: data.title || 'Untitled',
      date: data.date || new Date().toISOString(),
      excerpt: data.excerpt || '',
      content,
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getDocBySlug(slug: string): DocPage | null {
  const possiblePaths = [
    path.join(DOCS_DIR, slug + '.mdx'),
    path.join(DOCS_DIR, slug, 'page.mdx'),
    path.join(DOCS_DIR, slug + '.md'),
  ];
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(fileContent);
      return {
        slug,
        title: data.title || 'Untitled',
        date: data.date || new Date().toISOString(),
        excerpt: data.excerpt || '',
        content,
      };
    }
  }
  return null;
}

function getAllFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file: string) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath));
    } else if (file.endsWith('.mdx') || file.endsWith('.md')) {
      results.push(filePath);
    }
  });
  return results;
}
