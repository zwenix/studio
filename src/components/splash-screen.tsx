import Image from 'next/image';

export const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-[100] flex h-screen w-screen items-center justify-center bg-gradient-to-br from-indigo-600 via-blue-500 to-indigo-600">
      <div className="animate-fadeInZoom text-center">
        <Image
          src="https://i.ibb.co/tTc5gG5k/eduaicompanion-logo2-preview-1772467621580-2-preview-1772473153046.png"
          alt="EduAI Companion Logo"
          width={200}
          height={299}
          priority
          style={{ width: 'auto', height: '299px' }}
          className="mx-auto"
        />
        <h1 className="text-4xl font-bold text-white mt-6 font-patrick-hand">
          EduAI <span className="text-yellow-400">Companion</span>
        </h1>
        <p className="text-lg text-white/70 mt-2 animate-pulse">
          EduAI is Loading...
        </p>
      </div>
    </div>
  );
};