import { useCallback, useEffect, useState } from 'react'
import type { ChatMessage, Conversation, Dataset, Filters } from '../lib/types'
import type { ApiClient } from '../lib/api'
import { normalizeChatContent } from '../lib/formatters'

export function useConversations(
  api: ApiClient,
  showNotice: (msg: string) => void,
  dataset: Dataset | null,
  filters: Filters,
  datasets: Dataset[],
  selectDataset: (item: Dataset) => Promise<void>,
  setDataset: (item: Dataset | null) => void,
  openChatPanel?: () => void
) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)

  useEffect(() => {
    api
      .request('/api/conversations')
      .then(response => response.json())
      .then(setConversations)
      .catch(error => showNotice(error.message))
  }, [api, showNotice])

  const sendChat = useCallback(
    async (question = chatInput) => {
      const value = question.trim()
      if (!dataset || !value || chatBusy) return
      setMessages(current => [...current, { role: 'user', content: value }])
      setChatInput('')
      setChatBusy(true)
      try {
        let activeConversation = conversationId
        if (!activeConversation) {
          const created = await api.request('/api/conversations', {
            method: 'POST',
            body: JSON.stringify({ dataset_id: dataset.id, title: value.slice(0, 80) }),
          })
          const conversation = await created.json()
          activeConversation = conversation.id
          setConversations(current => [conversation, ...current])
          setConversationId(activeConversation)
        }
        await api.request(`/api/conversations/${activeConversation}/messages`, {
          method: 'POST',
          body: JSON.stringify({ role: 'user', content: value }),
        })
        const response = await api.request(`/api/datasets/${dataset.id}/chat`, {
          method: 'POST',
          body: JSON.stringify({ dataset_id: dataset.id, question: value, filters }),
        })
        const answer = await response.json()
        const answerText = normalizeChatContent(answer.answer ?? answer)
        const facts =
          answer.facts && typeof answer.facts === 'object'
            ? (answer.facts as Record<string, unknown>)
            : undefined
        await api.request(`/api/conversations/${activeConversation}/messages`, {
          method: 'POST',
          body: JSON.stringify({
            role: 'assistant',
            content: answerText,
            metadata: { facts },
          }),
        })
        setMessages(current => [...current, { role: 'assistant', content: answerText, facts }])
      } catch (error) {
        setMessages(current => [
          ...current,
          {
            role: 'assistant',
            content: error instanceof Error ? error.message : 'I could not answer that.',
          },
        ])
      } finally {
        setChatBusy(false)
      }
    },
    [chatInput, dataset, chatBusy, conversationId, api, filters]
  )

  const clearChat = useCallback(async () => {
    if (conversationId) {
      try {
        await api.request(`/api/conversations/${conversationId}`, { method: 'DELETE' })
        setConversations(current => current.filter(item => item.id !== conversationId))
      } catch (error) {
        showNotice(error instanceof Error ? error.message : 'Could not clear saved conversation.')
      }
    }
    setMessages([])
    setConversationId(null)
  }, [conversationId, api, showNotice])

  const reopenConversation = useCallback(
    async (conversation: Conversation) => {
      if (conversation.dataset_id) {
        const item = datasets.find(candidate => candidate.id === conversation.dataset_id)
        if (!item) {
          showNotice('The dataset for this conversation is no longer available.')
          return
        }
        await selectDataset(item)
      } else {
        setDataset(null)
      }
      try {
        const response = await api.request(`/api/conversations/${conversation.id}/messages`)
        const history = await response.json()
        setMessages(
          history.map(
            (message: {
              role: 'user' | 'assistant'
              content: unknown
              metadata?: { facts?: Record<string, unknown> }
            }) => ({
              role: message.role,
              content: normalizeChatContent(message.content),
              facts: message.metadata?.facts,
            })
          )
        )
        setConversationId(conversation.id)
        openChatPanel?.()
      } catch (error) {
        showNotice(error instanceof Error ? error.message : 'Could not restore conversation.')
      }
    },
    [datasets, selectDataset, setDataset, api, showNotice, openChatPanel]
  )

  const renameConversation = useCallback(
    async (conversation: Conversation) => {
      const title = window.prompt('Rename conversation', conversation.title)
      if (!title?.trim()) return
      try {
        const response = await api.request(`/api/conversations/${conversation.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ title: title.trim() }),
        })
        const updated = await response.json()
        setConversations(current =>
          current.map(item =>
            item.id === conversation.id ? { ...item, title: updated.title } : item
          )
        )
      } catch (error) {
        showNotice(error instanceof Error ? error.message : 'Could not rename conversation.')
      }
    },
    [api, showNotice]
  )

  const removeConversation = useCallback(
    async (conversation: Conversation) => {
      try {
        await api.request(`/api/conversations/${conversation.id}`, { method: 'DELETE' })
        setConversations(current => current.filter(item => item.id !== conversation.id))
        if (conversationId === conversation.id) {
          setConversationId(null)
          setMessages([])
        }
      } catch (error) {
        showNotice(error instanceof Error ? error.message : 'Could not delete conversation.')
      }
    },
    [conversationId, api, showNotice]
  )

  return {
    conversations,
    setConversations,
    conversationId,
    setConversationId,
    messages,
    setMessages,
    chatInput,
    setChatInput,
    chatBusy,
    sendChat,
    clearChat,
    reopenConversation,
    renameConversation,
    removeConversation,
  }
}
