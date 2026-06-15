export default function PageBackground({ children, className = '', bgImage = '/bg_project.jpg' }) {
  return (
    <div
      className={`relative min-h-screen bg-center bg-no-repeat ${className}`}
      style={{
        backgroundImage: `url('${bgImage}')`,
        backgroundSize: "100% 100%",
      }}
    >
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
