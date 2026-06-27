export interface UserStats {
  total: number;
  active: number;
  newThisMonth: number;
  roleDistribution: Array<{ name: string; value: number }>;
}

export interface PostStats {
  total: number;
  published: number;
  draft: number;
  monthlyPosts: Array<{ month: string; count: number }>;
}

export interface CommentStats {
  total: number;
  recent: number;
  monthly: Array<{ month: string; count: number }>;
}

export interface ViewStats {
  total: number;
  monthly: Array<{ month: string; count: number }>;
  topPosts: Array<{ title: string; views: number }>;
}

export interface SystemReport {
  userStats: UserStats;
  postStats: PostStats;
  commentStats: CommentStats;
  viewStats: ViewStats;
}

export interface SystemStatus {
  cpu?: {
    usage: number;
    temperature?: number;
  };
  memory?: {
    total: number;
    used: number;
    free: number;
  };
  disk?: {
    total: number;
    used: number;
    free: number;
  };
  uptime?: number;
}

export interface Activity {
  id: string;
  userEmail: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface SystemLog {
  id: string;
  level: string;
  message: string;
  source: string;
  timestamp: Date;
}

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}
