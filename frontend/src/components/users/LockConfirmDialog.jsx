import React from 'react';
import { Lock, X } from 'lucide-react';

export default function LockConfirmDialog({ user, onConfirm, onCancel }) {
    if (!user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-0 animate-fade-in-up sm:items-center sm:p-4">
            <div className="mx-4 w-full max-w-md overflow-hidden rounded-t-[20px] border border-[#d0d7e8] bg-[#f4f6fb] shadow-2xl sm:mx-0 sm:rounded-xl">
                <div className="flex justify-between items-center p-4 border-b border-[#d0d7e8]">
                    <h3 className="text-lg font-bold text-[#0f1623] flex items-center gap-2">
                        <Lock className="w-5 h-5 text-[#4f46e5]" /> Lock Account
                    </h3>
                    <button onClick={onCancel} className="text-[#7a87a8] hover:text-[#0f1623]">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-[#3a4560]">
                        Are you sure you want to lock <strong>{user.firstName} {user.lastName}'s</strong> account?
                    </p>
                    <div className="bg-orange-500/10 border border-[#4f46e5]/25 rounded-lg p-3 my-4">
                        <p className="text-sm text-[#4f46e5]">
                            The user will be immediately logged out of all devices and will not be able to log in until activated again.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-[#d0d7e8] bg-[#f4f6fb] p-4 sm:flex-row sm:justify-end">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-[#3a4560] hover:text-[#0f1623] bg-[#dde2f0] hover:bg-[#d0d7e8] transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-sm font-medium text-[#0f1623] bg-orange-600 hover:bg-orange-700 transition-colors">
                        Lock Account
                    </button>
                </div>
            </div>
        </div>
    );
}


