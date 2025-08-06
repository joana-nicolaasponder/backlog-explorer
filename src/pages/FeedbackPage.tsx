import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
const API_BASE_URL = import.meta.env.VITE_API_URL

const FeedbackPage = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      // Optionally get user info for name/email (if available)
      let userName = '';
      let userEmail = '';
      let userId = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userName = user.user_metadata?.full_name || user.email || '';
          userEmail = user.email || '';
          userId = user.id;
        }
      } catch (e) {
        // Not critical if user info fails
      }

      console.log('Submitting feedback:', { name: userName, email: userEmail, content, category, user_id: userId });
      const res = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName,
          email: userEmail,
          content,
          category,
          user_id: userId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send feedback');
      }

      setContent('');
      setCategory('general');
      setMessage('Thank you for your feedback! 🙌');
    } catch (error) {
      setMessage('Error submitting feedback. Please try again.');
      if (error instanceof Error) {
        console.error('Error:', error.message);
      } else {
        console.error('Unknown error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-4xl font-bold mb-8">Send Feedback</h1>
      
      <div className="bg-base-200 p-6 rounded-lg mb-8">
        <p className="text-lg">
          Help me improve Backlog Explorer! Share your thoughts, report bugs, or request new features.
          Your feedback is valuable to me. 🎮
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="label">
            <span className="label-text">Category</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="select select-bordered w-full"
            required
          >
            <option value="general">General Feedback</option>
            <option value="bug">Bug Report</option>
            <option value="feature_request">Feature Request</option>
          </select>
        </div>

        <div>
          <label className="label">
            <span className="label-text">Your Feedback</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="textarea textarea-bordered w-full h-32"
            placeholder="Share your thoughts, experiences, or suggestions..."
            required
          />
        </div>

        {message && (
          <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          className={`btn btn-primary w-full ${isSubmitting ? 'loading' : ''}`}
          disabled={isSubmitting}
        >
          Submit Feedback
        </button>
      </form>
    </div>
  );
};

export default FeedbackPage;
