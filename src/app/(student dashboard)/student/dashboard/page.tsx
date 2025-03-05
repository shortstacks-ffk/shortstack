import React from 'react';

export default function StudentDashboard() {
  return (
    <main className="container mx-auto p-4 ">
      <h1 className="text-xl font-bold mb-4 md:text-3xl">
        Welcome to your Student Dashboard!
      </h1>
      <p>
        You are now logged in. Here you can view your enrolled classes and other related details.
      </p>
      {/* Add additional dashboard content here */}
    </main>
  );
}