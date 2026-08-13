/** 云端同步配置（与 family-menu 共用同一 Supabase 项目，表名不同互不冲突） */
export const CLOUD = {
  supabaseUrl: 'https://ivyetikipnztrkwzzmkm.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2eWV0aWtpcG56dHJrd3p6bWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MjQxNDMsImV4cCI6MjEwMjEwMDE0M30.cefGx7PxFOmV3CY7WP0W8F0OAJvIKmhA0Kj8ONXkXVU',
  table: 'wedding_plan',
  rowId: 'wedding'
}

export const USE_CLOUD = Boolean(CLOUD.supabaseUrl && CLOUD.supabaseAnonKey)
