import React, { useState } from 'react';
import {
  ChevronDown, ChevronUp, LogIn, BriefcaseMedical, BookOpen,
  Bot, BarChart3, Settings, Download, Upload, Pill, Clock,
  PlusCircle, Trash2, Edit3, HelpCircle
} from 'lucide-react';

interface Section {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

const sections: Section[] = [
  {
    id: 'getting-started',
    icon: <LogIn size={20} />,
    title: 'Getting Started — Creating Your Account',
    content: (
      <div className="space-y-3 text-slate-600">
        <p>MedTrack AI requires a free account so your data is saved securely on the server and available from any device.</p>
        <ol className="list-decimal list-inside space-y-2 ml-2">
          <li>On the login screen, click <strong>Create Account</strong>.</li>
          <li>Enter your email address and choose a password (minimum 6 characters).</li>
          <li>Click <strong>Create Account</strong> — you are logged in immediately.</li>
          <li>Next time, use <strong>Sign In</strong> with the same email and password.</li>
        </ol>
        <p className="text-sm bg-teal-50 border border-teal-200 rounded-lg p-3 text-teal-800">
          <strong>Tip:</strong> Your session stays active for 30 days. You will only need to sign in again after that, or if you explicitly log out.
        </p>
      </div>
    ),
  },
  {
    id: 'backup-import',
    icon: <Upload size={20} />,
    title: 'Importing a Backup File',
    content: (
      <div className="space-y-3 text-slate-600">
        <p>If you have data from a previous version of MedTrack (before accounts were added), you can import it using your backup file.</p>
        <ol className="list-decimal list-inside space-y-2 ml-2">
          <li>On the login screen, click <strong>Import Backup File</strong> at the bottom.</li>
          <li>Select your <code className="bg-slate-100 px-1 rounded">.json</code> backup file — your email is filled in automatically.</li>
          <li>Enter your password (create an account if you don't have one yet).</li>
          <li>Click <strong>Sign In</strong> or <strong>Create Account</strong> — your backup data is pushed to your account immediately.</li>
        </ol>
        <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
          <strong>Note:</strong> Importing a backup will replace any data already stored in your account with the contents of the backup file.
        </p>
      </div>
    ),
  },
  {
    id: 'pill-cabinet',
    icon: <BriefcaseMedical size={20} />,
    title: 'Medication Cabinet — Setting Up Your Medications',
    content: (
      <div className="space-y-3 text-slate-600">
        <p>Before you can log anything, you need to add your medications to the Cabinet. Think of it as a master list of everything you take.</p>
        <h4 className="font-semibold text-slate-700">Adding a medication</h4>
        <ol className="list-decimal list-inside space-y-2 ml-2">
          <li>Go to the <strong>Cabinet</strong> tab.</li>
          <li>Click <strong>Add Medication</strong>.</li>
          <li>Enter the medication name (e.g. "Ibuprofen").</li>
          <li>Choose a colour to identify it visually in your diary.</li>
          <li>Add up to <strong>3 active ingredients</strong> with their dosage in mg (e.g. Ibuprofen 200mg).</li>
          <li>Click <strong>Save</strong>.</li>
        </ol>
        <h4 className="font-semibold text-slate-700 mt-4">Editing or deleting a medication</h4>
        <p>Click the <Edit3 size={14} className="inline" /> edit icon on any medication card to update it, or the <Trash2 size={14} className="inline" /> delete icon to remove it. Deleting a medication does not remove past log entries that referenced it.</p>
      </div>
    ),
  },
  {
    id: 'logging',
    icon: <BookOpen size={20} />,
    title: 'Your Diary — Logging Medications',
    content: (
      <div className="space-y-3 text-slate-600">
        <p>The <strong>Diary</strong> tab shows all your medication logs grouped by day, with ingredient totals for each day.</p>
        <h4 className="font-semibold text-slate-700">Creating a log entry</h4>
        <ol className="list-decimal list-inside space-y-2 ml-2">
          <li>Click <strong>Log Now</strong> (top right on desktop, or the <PlusCircle size={14} className="inline" /> button on mobile).</li>
          <li>Set the date and time (defaults to right now).</li>
          <li>Select up to <strong>5 medications</strong> from your cabinet.</li>
          <li>Use the <strong>−</strong> / <strong>+</strong> buttons to set the quantity for each (supports half doses: 0.5×, 1×, 1.5×, 2×, etc.).</li>
          <li>Add an optional note (e.g. "took with food", "mild headache").</li>
          <li>Click <strong>Save Entry</strong>.</li>
        </ol>
        <h4 className="font-semibold text-slate-700 mt-4">Editing or deleting a log entry</h4>
        <p>Tap any entry in the diary to open it for editing. To delete it, open the entry and click <strong>Delete Entry</strong> (you will be asked to confirm).</p>
        <p className="text-sm bg-teal-50 border border-teal-200 rounded-lg p-3 text-teal-800">
          <strong>Tip:</strong> Each day in your diary shows a total of every active ingredient consumed that day (in mg), making it easy to track cumulative dosage.
        </p>
      </div>
    ),
  },
  {
    id: 'ai-assistant',
    icon: <Bot size={20} />,
    title: 'AI Assistant — Log with Natural Language',
    content: (
      <div className="space-y-3 text-slate-600">
        <p>The AI Assistant lets you log medications and ask questions about your history using plain language — no tapping through menus required.</p>
        <h4 className="font-semibold text-slate-700">Logging by typing</h4>
        <p>Type something like:</p>
        <ul className="list-disc list-inside ml-2 space-y-1 font-mono text-sm bg-slate-50 rounded-lg p-3">
          <li>"took 2 ibuprofen and 1 paracetamol just now"</li>
          <li>"had half a melatonin at 10pm last night"</li>
          <li>"1.5 aspirin this morning with breakfast"</li>
        </ul>
        <p>The assistant matches what you wrote to medications in your Cabinet and creates a draft log entry for you to confirm.</p>
        <h4 className="font-semibold text-slate-700 mt-4">Asking questions about your history</h4>
        <p>You can also ask questions like:</p>
        <ul className="list-disc list-inside ml-2 space-y-1 font-mono text-sm bg-slate-50 rounded-lg p-3">
          <li>"How much ibuprofen did I take this week?"</li>
          <li>"When did I last take melatonin?"</li>
          <li>"What was my highest daily paracetamol dose this month?"</li>
        </ul>
        <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
          <strong>Note:</strong> The AI Assistant requires a Gemini API key to be configured on the server. If it is not set up, the assistant will show an error.
        </p>
      </div>
    ),
  },
  {
    id: 'reports',
    icon: <BarChart3 size={20} />,
    title: 'Reports & Analytics',
    content: (
      <div className="space-y-3 text-slate-600">
        <p>The <strong>Reports</strong> tab gives you a visual overview of your medication history.</p>
        <ul className="list-disc list-inside ml-2 space-y-2">
          <li><strong>Line charts</strong> show ingredient intake over time so you can spot patterns or trends.</li>
          <li><strong>Daily totals</strong> summarise how much of each active ingredient you consumed per day.</li>
          <li><strong>Search &amp; filter</strong> lets you narrow down entries by date range or medication name.</li>
        </ul>
        <p className="text-sm bg-teal-50 border border-teal-200 rounded-lg p-3 text-teal-800">
          <strong>Tip:</strong> Use Reports to check that you are staying within safe daily limits for any ingredient, especially for over-the-counter medications like paracetamol or ibuprofen.
        </p>
      </div>
    ),
  },
  {
    id: 'backup-export',
    icon: <Download size={20} />,
    title: 'Backing Up Your Data',
    content: (
      <div className="space-y-3 text-slate-600">
        <p>Your data is automatically saved to the server every time you make a change. You do not need to manually back up for normal use.</p>
        <p>However, you can download a local copy at any time:</p>
        <ol className="list-decimal list-inside space-y-2 ml-2">
          <li>Click the <strong>Backup</strong> button in the top navigation bar.</li>
          <li>A <code className="bg-slate-100 px-1 rounded">.json</code> file is downloaded to your device.</li>
        </ol>
        <p>Keep this file somewhere safe. You can use it to restore your data on a new account or a fresh installation by using the <strong>Import Backup File</strong> option on the login screen.</p>
      </div>
    ),
  },
  {
    id: 'settings',
    icon: <Settings size={20} />,
    title: 'Settings',
    content: (
      <div className="space-y-3 text-slate-600">
        <h4 className="font-semibold text-slate-700">Font size</h4>
        <p>Choose from preset sizes or enter a custom value to make the app comfortable to read. Changes apply immediately across the entire app.</p>
        <h4 className="font-semibold text-slate-700 mt-4">Email address</h4>
        <p>You can update the email address linked to your account from the Settings page. Enter your new email and click <strong>Update Email</strong>. Your existing data stays intact.</p>
      </div>
    ),
  },
  {
    id: 'faq',
    icon: <HelpCircle size={20} />,
    title: 'Frequently Asked Questions',
    content: (
      <div className="space-y-5 text-slate-600">
        <div>
          <p className="font-semibold text-slate-700">Can I use MedTrack on multiple devices?</p>
          <p>Yes. Sign in with the same email and password on any device and your data will sync automatically from the server.</p>
        </div>
        <div>
          <p className="font-semibold text-slate-700">What happens if I lose internet connection?</p>
          <p>The app works offline using a local cache. Any changes you make while offline are saved locally and will sync to the server next time you are online.</p>
        </div>
        <div>
          <p className="font-semibold text-slate-700">Is my data private?</p>
          <p>Your data is stored on the server you (or your administrator) controls. It is not shared with any third party. Passwords are encrypted with bcrypt and never stored in plain text.</p>
        </div>
        <div>
          <p className="font-semibold text-slate-700">Can I log medications I have not added to the Cabinet?</p>
          <p>No — medications must be added to the Cabinet first so that ingredients and dosages can be tracked accurately.</p>
        </div>
        <div>
          <p className="font-semibold text-slate-700">What is the maximum number of medications per log entry?</p>
          <p>You can log up to <strong>5 medications</strong> in a single entry. Each medication can have up to <strong>3 active ingredients</strong> defined in the Cabinet.</p>
        </div>
        <div>
          <p className="font-semibold text-slate-700">Can I log a past date or time?</p>
          <p>Yes. When creating or editing a log entry, use the date and time picker to set any past date and time.</p>
        </div>
        <div>
          <p className="font-semibold text-slate-700">How do I delete my account?</p>
          <p>Account deletion is not currently available in the app. Please contact your administrator to have your account and data removed from the server.</p>
        </div>
      </div>
    ),
  },
];

export const Help: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>('getting-started');

  const toggle = (id: string) => setOpenId(prev => (prev === id ? null : id));

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <p className="text-slate-500 mb-6">
        Everything you need to know about using MedTrack AI. Click any section to expand it.
      </p>

      {sections.map(section => (
        <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <button
            onClick={() => toggle(section.id)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition"
          >
            <div className="flex items-center gap-3 text-slate-800 font-semibold">
              <span className="text-teal-600">{section.icon}</span>
              {section.title}
            </div>
            <span className="text-slate-400 flex-shrink-0 ml-4">
              {openId === section.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </span>
          </button>

          {openId === section.id && (
            <div className="px-5 pb-5 pt-1 border-t border-slate-100">
              {section.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
