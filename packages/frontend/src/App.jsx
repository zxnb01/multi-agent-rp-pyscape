import React from 'react';
import { JobProvider } from './context/JobContext';
import Layout from './components/Layout';

function App() {
  return (
    <JobProvider>
      <Layout />
    </JobProvider>
  );
}

export default App;
