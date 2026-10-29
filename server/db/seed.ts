import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { Video } from '../models/Video';
import { HomepageConfig } from '../models/HomepageConfig';
import { Playlist } from '../models/Playlist';
import { getDatabaseStatus } from './connection';

export interface SeedSummary {
  database: string;
  administrator?: 'created' | 'verified';
  categories: { inserted: number; skipped: number };
  videos: { inserted: number; skipped: number };
  homepageConfig: 'created' | 'skipped';
  curatedPlaylist: 'created' | 'skipped';
}

export async function provisionAdministrator(): Promise<'created' | 'verified'> {
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();
  const adminName = (process.env.ADMIN_NAME || 'Vidora Administrator').trim();

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required.');
  }
  if (adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new Error('ADMIN_EMAIL must be a valid email address.');
  }

  const admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, await bcrypt.genSalt(12));
    await User.create({
      email: adminEmail,
      passwordHash,
      displayName: adminName || 'Vidora Administrator',
      role: 'admin',
      status: 'active',
      preferences: { theme: 'dark', autoplayNext: true, defaultQuality: '1080p' },
    });
    console.log('[Seed] Administrator account created.');
    return 'created';
  }

  if (admin.role !== 'admin') {
    throw new Error('The configured ADMIN_EMAIL belongs to an existing non-administrator account. Refusing to elevate it.');
  }
  if (!await admin.comparePassword(adminPassword)) {
    throw new Error('The existing administrator password does not match ADMIN_PASSWORD. Refusing to reset credentials.');
  }

  console.log('[Seed] Existing administrator credentials verified; account unchanged.');
  return 'verified';
}

export async function seedApplicationContent(): Promise<SeedSummary> {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    const admin = adminEmail ? await User.findOne({ email: adminEmail, role: 'admin' }) : null;

    // Seed Default Categories
    let categoriesInserted = 0;
    let categoriesSkipped = 0;
    const defaultCategories = [
      {
        name: 'Cinema & Sci-Fi',
        slug: 'cinema-sci-fi',
        description: 'Cinematic short films, sci-fi masterpieces, visual effects, and high-production indie filmmaking.',
        icon: 'Film',
        order: 1,
        status: 'published' as const,
      },
      {
        name: 'Technology & AI',
        slug: 'tech-ai',
        description: 'Next-gen computing, artificial intelligence breakthroughs, hardware engineering, and digital futures.',
        icon: 'Cpu',
        order: 2,
        status: 'published' as const,
      },
      {
        name: 'Space & Astronomy',
        slug: 'space-astronomy',
        description: 'Cosmic exploration, deep space observations, astrophysics, and rocket engineering.',
        icon: 'Rocket',
        order: 3,
        status: 'published' as const,
      },
      {
        name: 'Documentary & Nature',
        slug: 'documentary-nature',
        description: 'Breathtaking natural habitats, wildlife cinematography, and deep human narratives.',
        icon: 'Globe',
        order: 4,
        status: 'published' as const,
      },
      {
        name: 'Music & Audio',
        slug: 'music-audio',
        description: 'Live studio sessions, orchestral recordings, synthesizers, and acoustic engineering.',
        icon: 'Music',
        order: 5,
        status: 'published' as const,
      },
      {
        name: 'Art & Architecture',
        slug: 'art-architecture',
        description: 'Monumental structures, modernist design, architectural tours, and fine craft.',
        icon: 'Compass',
        order: 6,
        status: 'published' as const,
      },
    ];

    for (const cat of defaultCategories) {
      const existing = await Category.exists({ slug: cat.slug });
      if (existing) {
        categoriesSkipped++;
        continue;
      }
      await Category.create(cat);
      categoriesInserted++;
    }

    // 3. Seed Verified Curated YouTube Videos if catalog is empty
    let videosInserted = 0;
    const videoCount = await Video.countDocuments();
    let videosSkipped = videoCount > 0 ? videoCount : 0;
    if (videoCount === 0) {
      videosSkipped = 0;
      console.log('[Seed] Seeding curated YouTube catalog entries...');

      const catCinema = await Category.findOne({ slug: 'cinema-sci-fi' });
      const catTech = await Category.findOne({ slug: 'tech-ai' });
      const catSpace = await Category.findOne({ slug: 'space-astronomy' });
      const catDoc = await Category.findOne({ slug: 'documentary-nature' });
      const catMusic = await Category.findOne({ slug: 'music-audio' });
      const catArt = await Category.findOne({ slug: 'art-architecture' });

      const seedVideos = [
        {
          youtubeVideoId: 'R6MlUcmOul8',
          originalUrl: 'https://www.youtube.com/watch?v=R6MlUcmOul8',
          originalTitle: 'Tears of Steel — Sci-Fi VFX Short Film (4K)',
          displayTitle: 'Tears of Steel — Sci-Fi VFX Short Film (4K)',
          originalDescription: 'Set in a dystopian future Amsterdam, a group of scientists and military personnel stage an emotional standoff using cybernetic robotics.',
          displayDescription: 'Award-winning open source visual effects masterwork set in dystopian future Amsterdam.',
          channelId: 'UCbkwvqCNz_aP6EkgLhA6Fxg',
          channelTitle: 'Blender Studio',
          duration: '12:14',
          durationSeconds: 734,
          publishedAt: new Date('2024-01-15'),
          thumbnails: {
            default: 'https://i.ytimg.com/vi/R6MlUcmOul8/default.jpg',
            medium: 'https://i.ytimg.com/vi/R6MlUcmOul8/mqdefault.jpg',
            high: 'https://i.ytimg.com/vi/R6MlUcmOul8/hqdefault.jpg',
            maxres: 'https://i.ytimg.com/vi/R6MlUcmOul8/maxresdefault.jpg',
          },
          viewCount: 6840000,
          likeCount: 142000,
          commentCount: 4200,
          categoryId: catCinema?._id,
          categorySlug: 'cinema-sci-fi',
          tags: ['Sci-Fi', 'VFX', 'Blender', 'Cinematic', 'Robotics'],
          status: 'published' as const,
          isFeatured: true,
          featuredOrder: 1,
          viewsOnVidora: 124,
          syncStatus: 'synced' as const,
        },
        {
          youtubeVideoId: 'aqz-KE-bpKQ',
          originalUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
          originalTitle: 'Big Buck Bunny (4K 60fps Animation Classic)',
          displayTitle: 'Big Buck Bunny (4K 60fps Animation Classic)',
          originalDescription: 'A large and lovable rabbit deals with bullying forest creatures in this legendary open movie.',
          displayDescription: 'The legendary high-definition open cinema classic rendered in pristine 4K 60fps.',
          channelId: 'UCbkwvqCNz_aP6EkgLhA6Fxg',
          channelTitle: 'Blender Studio',
          duration: '9:56',
          durationSeconds: 596,
          publishedAt: new Date('2023-11-10'),
          thumbnails: {
            default: 'https://i.ytimg.com/vi/aqz-KE-bpKQ/default.jpg',
            medium: 'https://i.ytimg.com/vi/aqz-KE-bpKQ/mqdefault.jpg',
            high: 'https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg',
            maxres: 'https://i.ytimg.com/vi/aqz-KE-bpKQ/maxresdefault.jpg',
          },
          viewCount: 12500000,
          likeCount: 215000,
          commentCount: 9100,
          categoryId: catCinema?._id,
          categorySlug: 'cinema-sci-fi',
          tags: ['Animation', '4K', 'OpenMovie', 'Classic'],
          status: 'published' as const,
          isFeatured: false,
          featuredOrder: 2,
          viewsOnVidora: 88,
          syncStatus: 'synced' as const,
        },
        {
          youtubeVideoId: '21X5lGlDOfg',
          originalUrl: 'https://www.youtube.com/watch?v=21X5lGlDOfg',
          originalTitle: 'NASA | Earth From Orbit in Ultra High Definition',
          displayTitle: 'NASA | Earth From Orbit in Ultra High Definition',
          originalDescription: 'Spectacular time-lapse footage of our living planet captured from the International Space Station.',
          displayDescription: 'Witness the majesty of auroras, city lights, and lightning storms from orbital vantage points in 4K.',
          channelId: 'UCLA_DiR1FfKNvjuUpBHmylQ',
          channelTitle: 'NASA Goddard',
          duration: '5:45',
          durationSeconds: 345,
          publishedAt: new Date('2024-03-01'),
          thumbnails: {
            default: 'https://i.ytimg.com/vi/21X5lGlDOfg/default.jpg',
            medium: 'https://i.ytimg.com/vi/21X5lGlDOfg/mqdefault.jpg',
            high: 'https://i.ytimg.com/vi/21X5lGlDOfg/hqdefault.jpg',
            maxres: 'https://i.ytimg.com/vi/21X5lGlDOfg/maxresdefault.jpg',
          },
          viewCount: 4200000,
          likeCount: 120000,
          commentCount: 2800,
          categoryId: catSpace?._id,
          categorySlug: 'space-astronomy',
          tags: ['Space', 'NASA', 'ISS', 'Earth', 'Orbit', '4K'],
          status: 'published' as const,
          isFeatured: false,
          featuredOrder: 3,
          viewsOnVidora: 72,
          syncStatus: 'synced' as const,
        },
        {
          youtubeVideoId: 'bAaur57wE0A',
          originalUrl: 'https://www.youtube.com/watch?v=bAaur57wE0A',
          originalTitle: 'How Computer Chips Are Made — Inside a Semiconductor Fab',
          displayTitle: 'How Computer Chips Are Made — Inside a Semiconductor Fab',
          originalDescription: 'An astonishing journey through extreme ultraviolet lithography and silicon wafer fabrication.',
          displayDescription: 'Extreme ultraviolet lithography, silicon manipulation, and the pinnacle of human precision engineering.',
          channelId: 'UCgTs_yGjQhU7bY9rWfG3o2A',
          channelTitle: 'Asianometry',
          duration: '14:22',
          durationSeconds: 862,
          publishedAt: new Date('2024-02-18'),
          thumbnails: {
            default: 'https://i.ytimg.com/vi/bAaur57wE0A/default.jpg',
            medium: 'https://i.ytimg.com/vi/bAaur57wE0A/mqdefault.jpg',
            high: 'https://i.ytimg.com/vi/bAaur57wE0A/hqdefault.jpg',
            maxres: 'https://i.ytimg.com/vi/bAaur57wE0A/maxresdefault.jpg',
          },
          viewCount: 3100000,
          likeCount: 89000,
          commentCount: 3400,
          categoryId: catTech?._id,
          categorySlug: 'tech-ai',
          tags: ['Semiconductors', 'EUV', 'Chips', 'Engineering', 'Tech'],
          status: 'published' as const,
          isFeatured: false,
          featuredOrder: 4,
          viewsOnVidora: 64,
          syncStatus: 'synced' as const,
        },
        {
          youtubeVideoId: 'LXb3EKWsInQ',
          originalUrl: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
          originalTitle: 'COSTA RICA IN 4K 60fps HDR (Ultra HD)',
          displayTitle: 'Costa Rica in 4K 60fps — Wildlife & Rainforests',
          originalDescription: 'Experience tropical biodiversity, tree frogs, toucans, waterfalls, and untouched jungles.',
          displayDescription: 'Pristine biodiversity documentary showcasing exotic wildlife and lush rainforest canopies in 4K.',
          channelId: 'UCrhxX5XMGQPlH1pt6kPj_9Q',
          channelTitle: 'Jacob + Katie Schwarz',
          duration: '5:14',
          durationSeconds: 314,
          publishedAt: new Date('2023-10-05'),
          thumbnails: {
            default: 'https://i.ytimg.com/vi/LXb3EKWsInQ/default.jpg',
            medium: 'https://i.ytimg.com/vi/LXb3EKWsInQ/mqdefault.jpg',
            high: 'https://i.ytimg.com/vi/LXb3EKWsInQ/hqdefault.jpg',
            maxres: 'https://i.ytimg.com/vi/LXb3EKWsInQ/maxresdefault.jpg',
          },
          viewCount: 15400000,
          likeCount: 340000,
          commentCount: 11200,
          categoryId: catDoc?._id,
          categorySlug: 'documentary-nature',
          tags: ['Nature', 'Wildlife', '4K', 'Rainforest', 'Documentary'],
          status: 'published' as const,
          isFeatured: false,
          featuredOrder: 5,
          viewsOnVidora: 95,
          syncStatus: 'synced' as const,
        },
        {
          youtubeVideoId: 'k3_tw44QsZQ',
          originalUrl: 'https://www.youtube.com/watch?v=k3_tw44QsZQ',
          originalTitle: 'Hans Zimmer — Live in Prague (Time Interstellar)',
          displayTitle: 'Hans Zimmer — "Time" from Inception (Live in Prague)',
          originalDescription: 'Mesmerizing orchestral performance of Hans Zimmer iconic soundtrack Time live in concert.',
          displayDescription: 'Immersive live symphonic performance featuring powerful strings, guitars, and celestial crescendo.',
          channelId: 'UCgB3kC1gM6u1Rk_m6jF5pKw',
          channelTitle: 'Eagle Rock',
          duration: '4:47',
          durationSeconds: 287,
          publishedAt: new Date('2023-08-20'),
          thumbnails: {
            default: 'https://i.ytimg.com/vi/k3_tw44QsZQ/default.jpg',
            medium: 'https://i.ytimg.com/vi/k3_tw44QsZQ/mqdefault.jpg',
            high: 'https://i.ytimg.com/vi/k3_tw44QsZQ/hqdefault.jpg',
            maxres: 'https://i.ytimg.com/vi/k3_tw44QsZQ/maxresdefault.jpg',
          },
          viewCount: 8900000,
          likeCount: 260000,
          commentCount: 7800,
          categoryId: catMusic?._id,
          categorySlug: 'music-audio',
          tags: ['HansZimmer', 'Orchestral', 'Cinema', 'Soundtrack', 'Live'],
          status: 'published' as const,
          isFeatured: false,
          featuredOrder: 6,
          viewsOnVidora: 110,
          syncStatus: 'synced' as const,
        },
      ];

      for (const v of seedVideos) {
        await Video.create(v);
        videosInserted++;
      }
      console.log(`[Seed] Seeded ${seedVideos.length} showcase videos.`);
    }

    // 4. Update Category Counts
    const categories = await Category.find();
    for (const cat of categories) {
      const count = await Video.countDocuments({ categorySlug: cat.slug, status: 'published' });
      cat.videoCount = count;
      await cat.save();
    }

    // 5. Seed Homepage Configuration
    const featuredVideo = await Video.findOne({ isFeatured: true });
    let homeConfig = await HomepageConfig.findOne();
    let homepageConfigAction: SeedSummary['homepageConfig'];
    if (!homeConfig) {
      console.log('[Seed] Initializing Homepage CMS configuration...');
      await HomepageConfig.create({
        heroVideoId: featuredVideo?._id,
        heroCustomTitle: 'Experience High-Definition Open Cinema',
        heroCustomSubtitle: 'Curated 4K productions, award-winning visual masterworks, and deep explorations.',
        heroCustomBadge: 'EDITOR’S SELECTION',
        sections: [
          {
            id: 'sec-popular',
            title: 'Trending & Popular',
            subtitle: 'Most watched right now across VIDORA',
            type: 'popular',
            limit: 8,
            isVisible: true,
            order: 0,
          },
          {
            id: 'sec-cinema',
            title: 'Cinema & Masterpieces',
            subtitle: 'Cinematic visual effects and groundbreaking storytelling',
            type: 'category',
            categorySlug: 'cinema-sci-fi',
            limit: 6,
            isVisible: true,
            order: 1,
          },
          {
            id: 'sec-recent',
            title: 'Recently Added',
            subtitle: 'Fresh uploads and latest releases',
            type: 'recent',
            limit: 8,
            isVisible: true,
            order: 2,
          },
        ],
      });
      homepageConfigAction = 'created';
    } else {
      homepageConfigAction = 'skipped';
    }

    // 6. Seed a Curated Public Playlist
    const curatedPlaylist = await Playlist.findOne({ isCurated: true });
    let curatedPlaylistAction: SeedSummary['curatedPlaylist'];
    if (!curatedPlaylist && admin) {
      const allVideos = await Video.find({ status: 'published' }).limit(4);
      if (allVideos.length > 0) {
        await Playlist.create({
          userId: admin._id,
          title: 'VIDORA Showcase: Cinematic Horizons',
          description: 'A curated suite of visual excellence, orbital timelapses, and orchestral emotion.',
          visibility: 'public',
          isCurated: true,
          coverUrl: allVideos[0].thumbnails?.high || '',
          videos: allVideos.map((v, i) => ({
            videoId: v._id,
            youtubeVideoId: v.youtubeVideoId,
            order: i,
            addedAt: new Date(),
          })),
          videoCount: allVideos.length,
        });
        curatedPlaylistAction = 'created';
      } else {
        curatedPlaylistAction = 'skipped';
      }
    } else {
      curatedPlaylistAction = 'skipped';
    }

    const status = getDatabaseStatus();
    const summary: SeedSummary = {
      database: status.database,
      categories: { inserted: categoriesInserted, skipped: categoriesSkipped },
      videos: { inserted: videosInserted, skipped: videosSkipped },
      homepageConfig: homepageConfigAction,
      curatedPlaylist: curatedPlaylistAction,
    };
    console.log(`[Seed] Database initialization complete: ${JSON.stringify(summary)}.`);
    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown seed failure';
    const redacted = message
      .replace(/(mongodb(?:\+srv)?):\/\/[^@]+@/gi, '$1://***@')
      .replace(/(ADMIN_PASSWORD(?:=|: )).*/gi, '$1[REDACTED]');
    throw new Error(`VIDORA seed failed: ${redacted}`);
  }
}

export async function seedInitialData(): Promise<SeedSummary> {
  const administrator = await provisionAdministrator();
  const summary = await seedApplicationContent();
  summary.administrator = administrator;
  return summary;
}
