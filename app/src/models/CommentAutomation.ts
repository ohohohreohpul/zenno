export interface ICommentAutomationStats {
  commentsCaptured: number
  dmsSent: number
  booked: number
}

export interface ICommentAutomation {
  id: string
  workspaceId: string
  keyword: string
  postLabel: string
  openingDm: string
  status: 'active' | 'paused'
  stats: ICommentAutomationStats
  createdAt: Date
  updatedAt: Date
}
