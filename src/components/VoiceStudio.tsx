import React, { useEffect, useState } from 'react';
import { Check, Play, SlidersHorizontal, Volume2 } from 'lucide-react';
import {
  speechService,
  VoiceProfile,
  AvailableVoice,
  SpeechLanguagePreference,
  VoiceStyle
} from '../services/audio/speechService';

export const VoiceStudio: React.FC = () => {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [voices, setVoices] = useState<AvailableVoice[]>([]);
  const [selected, setSelected] = useState('anaya');
  const [language, setLanguage] = useState<SpeechLanguagePreference>('auto');
  const [style, setStyle] = useState<VoiceStyle>('natural');
  const [rate, setRate] = useState(1.02);
  const [pitch, setPitch] = useState(1.08);
  const [previewing, setPreviewing] = useState<string | null>(null);

  const refresh = () => {
    speechService.refreshVoices();
    setProfiles(speechService.getVoiceProfiles());
    setVoices(speechService.getAvailableVoices());
    setSelected(speechService.getSelectedProfileId());
    setLanguage(speechService.getLanguagePreference());
    setStyle(speechService.getVoiceStyle());

    const settings = speechService.getVoiceSettings();
    setRate(settings.rate);
    setPitch(settings.pitch);
  };

  useEffect(() => {
    refresh();

    const timer = window.setTimeout(refresh, 500);
    return () => window.clearTimeout(timer);
  }, []);

  const selectProfile = (profile: VoiceProfile) => {
    if (speechService.selectVoiceProfile(profile.id)) {
      setSelected(profile.id);

      const settings = speechService.getVoiceSettings();
      setRate(settings.rate);
      setPitch(settings.pitch);
    }
  };

  const preview = (profile: VoiceProfile) => {
    setPreviewing(profile.id);

    speechService.previewVoice(profile.id, language);

    window.setTimeout(() => {
      setPreviewing(null);
      refresh();
    }, 1800);
  };

  const updateLanguage = (value: SpeechLanguagePreference) => {
    setLanguage(value);
    speechService.setLanguagePreference(value);
  };

  const updateStyle = (value: VoiceStyle) => {
    setStyle(value);
    speechService.setVoiceStyle(value);

    const settings = speechService.getVoiceSettings();
    setRate(settings.rate);
    setPitch(settings.pitch);
  };

  const updateRate = (value: number) => {
    setRate(value);
    speechService.setVoiceSettings(value, pitch);
  };

  const updatePitch = (value: number) => {
    setPitch(value);
    speechService.setVoiceSettings(rate, value);
  };

  const actualVoiceCount = voices.length;

  return (
    <div className="space-y-6">

      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
            <Volume2 className="w-5 h-5 text-cyan-300" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">
              AURA Voice Studio
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose how AURA sounds when speaking with you.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-3xl bg-slate-950/80 border border-white/10">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h4 className="text-sm font-bold text-white">
              Your Voice
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Named profiles automatically use a real voice available
              in your browser/device.
            </p>
          </div>

          <div className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-300">
            {actualVoiceCount > 0
              ? `${actualVoiceCount} REAL VOICES DETECTED`
              : 'NO BROWSER VOICES DETECTED'}
          </div>
        </div>

        <div className="grid gap-3">
          {profiles.map(profile => {
            const isSelected = selected === profile.id;
            const mappedVoice = profile.voiceName;

            return (
              <div
                key={profile.id}
                className={`rounded-2xl border p-4 transition-all ${
                  isSelected
                    ? 'border-cyan-500/50 bg-cyan-500/[0.07] shadow-lg shadow-cyan-500/5'
                    : 'border-white/[0.08] bg-slate-900/50 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">

                  <button
                    type="button"
                    onClick={() => selectProfile(profile)}
                    className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-400/15 text-cyan-300'
                        : 'border-white/10 bg-slate-900 text-slate-500'
                    }`}
                    title={`Select ${profile.name}`}
                  >
                    {isSelected ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-600" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-bold text-white">
                        {profile.name}
                      </h5>

                      {isSelected && (
                        <span className="text-[9px] font-bold text-cyan-300 border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 rounded-full">
                          SELECTED
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-0.5">
                      {profile.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {profile.languages.map(item => (
                        <span
                          key={item}
                          className="text-[9px] uppercase font-mono text-slate-500 border border-white/[0.06] px-1.5 py-0.5 rounded-md"
                        >
                          {item}
                        </span>
                      ))}
                    </div>

                    <p className="text-[9px] text-slate-600 mt-2 truncate">
                      {mappedVoice
                        ? `Browser voice: ${mappedVoice}`
                        : 'Browser voice: matching automatically'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => preview(profile)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-slate-900 text-xs font-semibold text-slate-300 hover:text-white hover:border-cyan-500/30 transition"
                  >
                    <Play
                      className={`w-3.5 h-3.5 ${
                        previewing === profile.id
                          ? 'animate-pulse text-cyan-300'
                          : ''
                      }`}
                    />
                    {previewing === profile.id ? 'Playing' : 'Preview'}
                  </button>

                </div>
              </div>
            );
          })}
        </div>

        {actualVoiceCount === 0 && (
          <div className="mt-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300">
            Your browser has not exposed any SpeechSynthesis voices yet.
            AURA will refresh the list when the browser makes voices available.
          </div>
        )}
      </div>

      <div className="p-5 rounded-3xl bg-slate-950/80 border border-white/10 space-y-5">

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-cyan-300" />
          <h4 className="text-sm font-bold text-white">
            Speaking Preferences
          </h4>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Voice Style
          </label>
          <select
            value={style}
            onChange={e => updateStyle(e.target.value as VoiceStyle)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500/40"
          >
            <option value="natural">Natural</option>
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Conversation Language
          </label>

          <select
            value={language}
            onChange={e => setLanguage(e.target.value as SpeechLanguagePreference)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500/40"
          >
            <option value="auto">Auto</option>
            <option value="hi">Hindi</option>
            <option value="en">English</option>
            <option value="hinglish">Hinglish</option>
          </select>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300">
              Speaking Speed
            </label>
            <span className="text-[10px] font-mono text-cyan-300">
              {rate.toFixed(2)}x
            </span>
          </div>

          <input
            type="range"
            min="0.6"
            max="1.4"
            step="0.01"
            value={rate}
            onChange={e => updateRate(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300">
              Voice Pitch
            </label>
            <span className="text-[10px] font-mono text-cyan-300">
              {pitch.toFixed(2)}
            </span>
          </div>

          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.01"
            value={pitch}
            onChange={e => updatePitch(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </div>

        <div className="pt-2 border-t border-white/[0.06]">
          <p className="text-[10px] text-slate-500">
            Voice preferences are saved locally in this browser.
            No audio recording is uploaded by Voice Studio.
          </p>
        </div>

      </div>
    </div>
  );
};
