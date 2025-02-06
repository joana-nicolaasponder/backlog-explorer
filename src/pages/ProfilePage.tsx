import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (currentUser) {
          setUser(currentUser);
          setEditedName(currentUser.user_metadata?.full_name || '');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setError(error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button className="btn btn-sm" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>No user data found. Try signing out and back in.</span>
          <button className="btn btn-sm" onClick={handleSignOut}>Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Success Toast */}
      <div id="success-toast" className="toast toast-top toast-end hidden">
        <div className="alert alert-success">
          <span>Name updated successfully!</span>
        </div>
      </div>

      {/* Error Toast */}
      <div id="error-toast" className="toast toast-top toast-end hidden">
        <div className="alert alert-error">
          <span>Failed to update name. Please try again.</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">User Profile</h1>
        
        {/* User Info Section */}
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title mb-4">Account Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <div className="flex items-center gap-2">
                  {isEditingName ? (
                    <>
                      <input 
                        type="text" 
                        className="input input-bordered w-full max-w-xs" 
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder="Enter your name"
                        autoFocus
                      />
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={async () => {
                          try {
                            const { error } = await supabase.auth.updateUser({
                              data: { full_name: editedName }
                            });
                            if (error) throw error;
                            
                            // Update local user state
                            setUser({
                              ...user,
                              user_metadata: { ...user.user_metadata, full_name: editedName }
                            });
                            
                            // Exit edit mode
                            setIsEditingName(false);
                            
                            // Show success toast
                            const toast = document.getElementById('success-toast');
                            if (toast) toast.classList.remove('hidden');
                            setTimeout(() => {
                              const toast = document.getElementById('success-toast');
                              if (toast) toast.classList.add('hidden');
                            }, 3000);
                          } catch (error) {
                            console.error('Error updating name:', error);
                            // Show error toast
                            const toast = document.getElementById('error-toast');
                            if (toast) toast.classList.remove('hidden');
                            setTimeout(() => {
                              const toast = document.getElementById('error-toast');
                              if (toast) toast.classList.add('hidden');
                            }, 3000);
                          }
                        }}
                      >
                        Save
                      </button>
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setIsEditingName(false);
                          setEditedName(user.user_metadata?.full_name || '');
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-lg">{user.user_metadata?.full_name || 'No name set'}</p>
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setEditedName(user.user_metadata?.full_name || '');
                          setIsEditingName(true);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <p className="text-lg">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Member Since</label>
                <p className="text-lg">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title mb-4">Settings</h2>
            <div className="space-y-4">
              <button 
                className="btn btn-error"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
