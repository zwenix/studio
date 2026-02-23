import Image from 'next/image';

export const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-[100] flex h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      <div className="animate-fadeInZoom">
        <Image
          src="https://i.ibb.co/pjdTJHdk/eduaicompanion-logo1-no-bg-720x1075.png"
          alt="EduAI Companion Logo"
          width={150}
          height={150}
          priority
        />
      </div>
    </div>
  );
};
