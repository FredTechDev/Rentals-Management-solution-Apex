import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { MessageSquare, Send, Sparkles, Users } from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { showErrorAlert } from '../lib/alerts';
import { getApiErrorMessage } from '../lib/api';
import { messageService } from '../services/messageService';
import '../styles/Community.css';

const emojis = ['😊', '😂', '🔥', '🚀', '🏡', '✨', '👍', '🙏', '💯', '❤️'];

const Community = () => {
  const scrollRef = useRef(null);
  const { user, isAuthenticated, loading: sessionLoading } = useSession();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    fetchMessages();
  }, [isAuthenticated]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!sessionLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const fetchMessages = async () => {
    setLoadingMessages(true);
    setError('');

    try {
      const nextMessages = await messageService.getMessages();
      setMessages(nextMessages);
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Failed to load community messages.');
      setError(message);
      await showErrorAlert('Messages Unavailable', message);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!newMessage.trim()) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const createdMessage = await messageService.sendMessage({ content: newMessage.trim() });
      setMessages((currentMessages) => [...currentMessages, createdMessage]);
      setNewMessage('');
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Failed to send your message.');
      setError(message);
      await showErrorAlert('Message Failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="community-page">
      <div className="community-sidebar glass-card">
        <div className="sidebar-header">
          <Users size={24} />
          <span>Neighbors</span>
        </div>
        <div className="online-users">
          <h4>Community Lounge</h4>
          <p className="subtext" style={{ fontSize: '0.8rem', opacity: 0.7, padding: '10px' }}>
            {user?.role === 'landlord' || user?.role === 'property_manager'
              ? 'Coordinate tenants, updates, and notices from here.'
              : 'Connect with your neighbors and management.'}
          </p>
        </div>
      </div>

      <div className="community-chat-container glass-card">
        <div className="chat-header">
          <div className="flex items-center gap-2">
            <h2><MessageSquare className="text-primary" /> Community Lounge</h2>
            <Sparkles size={16} className="text-secondary" />
          </div>
          <p>Connect and collaborate with your neighborhood.</p>
        </div>

        {error && <div className="error-msg" style={{ marginBottom: '16px' }}>{error}</div>}

        <div className="message-list" ref={scrollRef}>
          {loadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50">
              <MessageSquare size={48} />
              <p>Loading messages...</p>
            </div>
          ) : messages.length > 0 ? messages.map((message) => (
            <div key={message._id} className={`message-item ${message.sender?._id === user?.id ? 'sent' : 'received'}`}>
              <span className="sender-name">
                {message.sender?._id === user?.id ? 'You' : message.sender?.name || 'Anonymous'}
              </span>
              <div className="message-bubble">
                {message.content}
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center h-full opacity-50">
              <MessageSquare size={48} />
              <p>No messages yet. Start the conversation!</p>
            </div>
          )}
        </div>

        <div className="emoji-picker glass-card">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setNewMessage((currentMessage) => currentMessage + emoji)}
              className="emoji-btn"
            >
              {emoji}
            </button>
          ))}
        </div>

        <form className="chat-input" onSubmit={handleSendMessage}>
          <input
            type="text"
            placeholder="Share something with the community..."
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={submitting}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Community;
