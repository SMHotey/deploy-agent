import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const DOCS_DIR = path.join(process.cwd(), 'src/docs');

export interface DocItem {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (slug) {
      // Return single doc
      const possiblePaths = [
        path.join(DOCS_DIR, `${slug}.mdx`),
        path.join(DOCS_DIR, slug, 'page.mdx'),
        path.join(DOCS_DIR, `${slug}.md`),
      ];

      for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const { data, content } = matter(fileContent);
          return NextResponse.json({
            slug,
            title: data.title || 'Untitled',
            date: data.date || new Date().toISOString(),
            excerpt: data.excerpt || '',
            content,
          });
        }
      }

      return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
    }

    // List all docs
    const files = getAllFiles(DOCS_DIR);
    const docs = files.map((filePath) => {
      const relativePath = path.relative(DOCS_DIR, filePath);
      const slug = relativePath.replace(/\.mdx$/, '').replace(/\\/g, '/');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(fileContent);
      return {
        slug,
        title: data.title || 'Untitled',
        excerpt: data.excerpt || '',
        date: data.date || new Date().toISOString(),
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ docs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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
