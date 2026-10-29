import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Video, ExternalLink, ArrowLeft } from 'lucide-react';
import { VideoItem } from '../types';
import { VideoCard } from '../components/common/VideoCard';
import { api } from '../lib/api';

interface ChannelInfo {
  channelId: string;
  channelTitle: string;
  channelThumbnailUrl?: string;
  videoCount: number;
}

export const ChannelPage: React.FC = () => {
  const { channelId } = useParams<{ channelId: string }>();

  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!channelId) return;
    setIsLoading(true);
    setError(null);

    api.get<{ success: boolean; channel: ChannelInfo; videos: VideoItem[] }>(`/api/channels/${channelId}`)
      .then((res) => {
        if (res.success && res.channel) {
          setChannel(res.channel);
          setVideos(res.videos || []);
        } else {
          setError('Channel not found in VIDORA catalog.');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load channel.');
      })
      .finally(() => setIsLoading(false));
  }, [channelId]);

  if (isLoading) {
    return (
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-32 rounded-3xl bg-slate-900 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-video bg-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <User className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Creator Channel Not Found</h2>
        <p className="text-sm text-slate-400">{error || 'No videos from this creator are currently in the catalog.'}</p>
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Channel Banner */}
      <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-xl shrink-0">
          {channel.channelTitle ? channel.channelTitle[0].toUpperCase() : 'C'}
        </div>

        <div className="space-y-2 text-center sm:text-left flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {channel.channelTitle}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Verified Creator Catalog on VIDORA
              </p>
            </div>

            <a
              href={`https://www.youtube.com/channel/${channel.channelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors self-center sm:self-auto"
            >
              YouTube Channel
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="pt-2">
            <span className="text-xs font-mono font-bold text-rose-400 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
              {channel.videoCount} {channel.videoCount === 1 ? 'Curated Video' : 'Curated Videos'}
            </span>
          </div>
        </div>
      </div>

      {/* Videos Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white tracking-tight">
          Videos by {channel.channelTitle} ({videos.length})
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </div>
      </div>
    </div>
  );
};
