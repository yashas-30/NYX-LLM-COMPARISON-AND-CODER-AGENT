import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
export const terminalRouter = Router();

// Store background terminal tasks indexed by nodeId
const tasks = new Map<string, { output: string; isFinished: boolean }>();

terminalRouter.post('/run', async (req, res) => {
  const { command, cwd } = req.body;
  
  if (!command) {
    return res.status(400).json({ error: "Command is required" });
  }

  // Security: In a real app, you'd want to restrict commands.
  // For this local lab, we allow full access as requested by the user.
  
  try {
    const { stdout, stderr } = await execPromise(command, { 
      cwd: cwd || process.cwd(),
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    
    res.json({ stdout, stderr });
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr 
    });
  }
});

// Start executing command in background and poll for output
terminalRouter.post('/prompt', (req, res) => {
  const { nodeId, prompt } = req.body;
  if (!nodeId || !prompt) {
    return res.status(400).json({ error: "nodeId and prompt are required" });
  }

  // Initialize task state
  tasks.set(nodeId, { output: '', isFinished: false });

  console.log(`[Terminal Bridge] Starting command for node ${nodeId}: ${prompt}`);

  // Run the command asynchronously in background
  exec(prompt, { 
    cwd: process.cwd(),
    env: { ...process.env, FORCE_COLOR: '1' }
  }, (error, stdout, stderr) => {
    let output = stdout || '';
    if (stderr) {
      output += `\nStderr:\n${stderr}`;
    }
    if (error) {
      output += `\nError:\n${error.message}`;
    }
    
    console.log(`[Terminal Bridge] Command finished for node ${nodeId}`);
    
    // Update task status as finished with final output
    tasks.set(nodeId, { 
      output: output || 'Command completed successfully with no output.', 
      isFinished: true 
    });
  });

  res.json({ status: 'started' });
});

// Poll the output of a running terminal task
terminalRouter.get('/poll', (req, res) => {
  const nodeId = req.query.nodeId as string;
  if (!nodeId) {
    return res.status(400).json({ error: "nodeId is required" });
  }

  const task = tasks.get(nodeId);
  if (!task) {
    return res.status(404).json({ error: "No terminal task found for this nodeId" });
  }

  if (task.isFinished) {
    res.json({ status: 'success', output: task.output });
  } else {
    res.json({ status: 'running' });
  }
});

