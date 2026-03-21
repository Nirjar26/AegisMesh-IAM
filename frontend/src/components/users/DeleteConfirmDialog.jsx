import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';

export default function DeleteConfirmDialog({ user, onConfirm, onCancel }) {
    const [confirmText, setConfirmText] = useState('');
    if (!user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in-up">
            <div className="bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-[#d0d7e8]">
                    <h3 className="text-lg font-bold text-[#0f1623] flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-red-500" /> Delete Account
                    </h3>
                    <button onClick={onCancel} className="text-[#7a87a8] hover:text-[#0f1623]">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-[#3a4560] mb-4">
                        This action is permanent and cannot be undone. All data associated with <strong>{user.email}</strong> will be permanently removed.
                    </p>
                    <div className="bg-[#ffffff] border border-[#d0d7e8] rounded-lg p-4">
                        <label className="block text-sm font-medium text-[#7a87a8] mb-2">
                            Type <strong className="text-[#3a4560]">{user.email || 'DELETE'}</strong> to confirm
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="w-full bg-[#f4f6fb] border border-[#b8c2d8] rounded text-[#0f1623] px-3 py-2 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
                            placeholder={user.email || 'DELETE'}
                        />
                    </div>
                </div>
                <div className="p-4 border-t border-[#d0d7e8] flex justify-end gap-3 bg-[#f4f6fb]">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-[#3a4560] hover:text-[#0f1623] bg-[#dde2f0] hover:bg-[#d0d7e8] transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={confirmText !== (user.email || 'DELETE')}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-[#0f1623] bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Delete Permanently
                    </button>
                </div>
            </div>
        </div>
    );
}


