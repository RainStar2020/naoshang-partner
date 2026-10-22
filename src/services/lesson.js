import {config} from '../config'
import {getSession,request} from './api'
import {getLearningLevelDetail} from './learning'
import {getColumn} from './commerce'
import {normalizeContent} from '../features/content/rich-content'
// TODO(API): mock-only chapter bodies and video URL are independent of empty CMS benefits/templates.
export async function getLesson(query){const session=getSession();if(!session?.user?.id)throw new Error('请先登录');if(!query.chapterId)throw new Error('缺少课程编号');let result
  if(config.useMock){let chapter;if(query.columnId){const column=await getColumn(query.columnId);if(!column.unlocked)throw new Error('请先激活专栏');chapter=column.chapters.find(x=>x.id===query.chapterId)}else{const detail=await getLearningLevelDetail(query.contextId,query.levelId);if(!detail.unlocked)throw new Error('当前会员尚未解锁课程');chapter=detail.chapters.find(x=>x.id===query.chapterId&&x.accessible)}if(!chapter)throw new Error('课程不存在或无权访问');result={...chapter,content:{version:1,format:'nodes',nodes:[{name:'h2',children:[{type:'text',text:chapter.title}]},{name:'p',children:[{type:'text',text:'观察身边的物品，用有趣的联想把它们连接起来。先尝试回忆，再回看内容，逐步建立自己的学习节奏。'}]}]},videoUrl:chapter.type==='video'?'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4':'',posterUrl:'/static/media/video-poster-background.png'}}
  else result=await request(`/lessons/${encodeURIComponent(query.chapterId)}`,{data:{contextId:query.contextId,levelId:query.levelId,columnId:query.columnId}})
  if(getSession()?.user?.id!==session.user.id||getSession()?.token!==session.token)throw new Error('账号已变化，请重新加载');if(result?.id!==query.chapterId)throw new Error('课程数据异常');return {...result,content:normalizeContent(result.content)}
}
