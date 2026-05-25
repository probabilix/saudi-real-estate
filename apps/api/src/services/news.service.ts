import { db } from '../db';
import { news, newsFavorites } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

export class NewsService {
  /**
   * Get all published news posts
   */
  static async getPublishedNews() {
    return db.select()
      .from(news)
      .where(eq(news.isPublished, true))
      .orderBy(desc(news.publishedAt));
  }

  /**
   * Get all news posts (for admin)
   */
  static async getAllNews() {
    return db.select()
      .from(news)
      .orderBy(desc(news.createdAt));
  }

  /**
   * Get news post by slug
   */
  static async getNewsBySlug(slug: string, userId?: string) {
    const [post] = await db.select()
      .from(news)
      .where(eq(news.slug, slug))
      .limit(1);

    if (!post) return null;

    if (userId) {
      const fav = await db.select()
        .from(newsFavorites)
        .where(and(
          eq(newsFavorites.userId, userId),
          eq(newsFavorites.newsId, post.id)
        ))
        .limit(1);

      return {
        ...post,
        isFavorited: fav.length > 0
      };
    }

    return {
      ...post,
      isFavorited: false
    };
  }

  /**
   * Create new news post
   */
  static async createNews(data: any) {
    const [post] = await db.insert(news)
      .values({
        ...data,
        publishedAt: data.isPublished ? new Date() : null,
      })
      .returning();
    return post;
  }

  /**
   * Update news post
   */
  static async updateNews(id: string, data: any) {
    const [post] = await db.update(news)
      .set({
        ...data,
        updatedAt: new Date(),
        publishedAt: data.isPublished ? (data.publishedAt || new Date()) : null,
      })
      .where(eq(news.id, id))
      .returning();
    return post;
  }

  /**
   * Delete news post
   */
  static async deleteNews(id: string) {
    await db.delete(news).where(eq(news.id, id));
    return { success: true };
  }
}
