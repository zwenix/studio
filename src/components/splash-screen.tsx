import Image from 'next/image';

export const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-[100] flex h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      <div className="animate-fadeInZoom text-center">
        <Image
          src="https://i.ibb.co/tTc5gG5k/eduaicompanion-logo2-preview-1772467621580-2-preview-1772473153046.png"
          alt="EduAI Companion Logo"
          width={200}
          height={299}
          priority
          className="mx-auto"
        />
        <h1 className="text-4xl font-bold text-white mt-6 font-headline">
          EduAI Companion
        </h1>
        <p className="text-lg text-white/70 mt-2 animate-pulse">
          EduAI is Loading...
        </p>
      </div>
    </div>
  );
};
