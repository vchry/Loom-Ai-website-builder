import { Request, Response } from "express";
import prisma from "../lib/prisma";
import openai from "../configs/openai";

//controller dfunction to make revision
export const makeRevision = async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  try {
    const projectId = req.params.projectId as string;
    const { message } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userId || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.credits < 5) {
      return res
        .status(403)
        .json({ message: "add more credits to make changes" });
    }

    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Please enter a valid prompt" });
    }

    const currentProject = await prisma.websiteProject.findUnique({
      where: { id: projectId },
      include: { versions: true },
    });

    if (!currentProject) {
      return res.status(404).json({ message: "Please not found" });
    }

    await prisma.conversation.create({
      data: {
        role: "user",
        content: message,
        projectId,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 5 } },
    });

    const promptEnhanceResponse = await openai.chat.completions.create({
      model: "stepfun/step-3.5-flash:free",
      messages: [
        {
          role: "system",
          content: `
You are a prompt enhancement specialist. The user wants to make changes to their website. Enhance their request to be more specific and actionable for a web developer.

Enhance this by:
1. Being specific about what elements to change
2. Mentioning design details (colors, spacing, sizes)
3. Clarifying the desired outcome
4. Using clear technical terms

Return ONLY the enhanced request, nothing else. Keep it concise (1-2 sentences).
`,
        },
        {
          role: "user",
          content: `User's request: "${message}"`,
        },
      ],
    });

    const enhancedPrompt =
      promptEnhanceResponse.choices[0].message.content || "";

    await prisma.conversation.create({
      data: {
        role: "assistant",
        content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
        projectId,
      },
    });

    await prisma.conversation.create({
      data: {
        role: "assistant",
        content: `Now making changes to website...`,
        projectId,
      },
    });

    const codeGenerationResponse = await openai.chat.completions.create({
      model: "stepfun/step-3.5-flash:free",
      messages: [
        {
          role: "system",
          content: `
You are an expert web developer. 

CRITICAL REQUIREMENTS:
- Return ONLY the complete updated HTML code with the requested changes.
- Use Tailwind CSS for ALL styling (NO custom CSS).
- Use Tailwind utility classes for all styling changes.
- Include all JavaScript in <script> tags before closing </body>
- Make sure it's a complete, standalone HTML document with Tailwind CSS
- Return the HTML Code Only, nothing else

Apply the requested changes while maintaining the Tailwind CSS styling approach.
`,
        },
        {
          role: "user",
          content: `Here is current website code: "${currentProject.current_code}" The user wants this changes: "${enhancedPrompt}"`,
        },
      ],
    });

    const code = codeGenerationResponse.choices[0].message.content || "";

    if (!code) {
      await prisma.conversation.create({
        data: {
          role: "assistant",
          content: "Unable to generate the code, please try again",
          projectId,
        },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: 5 } },
      });
      return;
    }

    const versions = await prisma.version.create({
      data: {
        code: code
          .replace(/^[a-z]*\n?/gi, "")
          .replace(/`$/, "")
          .trim(),
        description: "Changes made",
        projectId,
      },
    });

    await prisma.conversation.create({
      data: {
        role: "assistant",
        content: "I've made changes to your website! You can now preview it",
        projectId,
      },
    });

    await prisma.websiteProject.update({
      where: { id: projectId },
      data: {
        current_code: code
          .replace(/^[a-z]*\n?/gi, "")
          .replace(/^$/, "")
          .trim(),
        current_version_index: versions.id,
      },
    });

    res.json({ message: "Change make successfully" });
  } catch (error: any) {
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: 5 } },
    });

    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

// Controller function to roll back to specific version
export const rollbackToVersion = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const projectId = req.params.projectId as string;
    const versionId = req.params.versionId as string;

    const project = await prisma.websiteProject.findUnique({
      where: { id: projectId },
      include: { versions: true },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const version = project.versions.find((version) => {
      return version.id === versionId;
    });

    if (!version) {
      return res.status(404).json({ message: "Version not found" });
    }

    await prisma.websiteProject.update({
      where: { id: projectId },
      data: {
        current_code: version.code,
        current_version_index: version.id,
      },
    });

    await prisma.conversation.create({
      data: {
        role: "assistant",
        content:
          "I've rolled back your website to selected version. You can now preview it",
        projectId,
      },
    });

    res.json({ message: "Version rolled back" });
  } catch (error: any) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

// Constroller function to Delete a project
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const projectId = req.params.projectId as string;

    await prisma.websiteProject.delete({
      where: { id: projectId },
    });

    res.json({ message: "Project delete successfully" });
  } catch (error: any) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

// Controller for getting project code for preview
export const getProjectPreview = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const projectId = req.params.projectId as string;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const project = await prisma.websiteProject.findFirst({
      where: { id: projectId },
      include: { versions: true },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({ project });
  } catch (error: any) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

// Get published project
export const getPublishedProjects = async (req: Request, res: Response) => {
  try {
    const projects = await prisma.websiteProject.findMany({
      where: { isPublished: true },
      include: { user: true },
    });

    res.json({ projects });
  } catch (error: any) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

// Get single project by id
export const getProjectById = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string;

    const project = await prisma.websiteProject.findFirst({
      where: { id: projectId },
    });

    if (!project || project.isPublished === false || !project?.current_code) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({ code: project.current_code });
  } catch (error: any) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

//Controller to save project code
export const saveProjectCode = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const projectId = req.params.projectId as string;
    const { code } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!code) {
      return res.status(400).json({ message: "Code is required" });
    }

    const project = await prisma.websiteProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    await prisma.websiteProject.update({
      where: { id: projectId },
      data: { current_code: code, current_version_index: "" },
    });

    res.json({ message: "Project saved successfully" });
  } catch (error: any) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

// import { Request, Response } from "express";
// import prisma from "../lib/prisma";
// import openai from "../configs/openai";

// export const makeRevision = async (req: Request, res: Response) => {
//   const userId = (req as any).userId;
//   try {
//     const projectId = req.params.projectId as string;
//     const { message } = req.body;

//     const user = await prisma.user.findUnique({
//       where: { id: userId },
//     });

//     if (!userId || !user) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     if (user.credits < 5) {
//       return res
//         .status(403)
//         .json({ message: "add more credits to make changes" });
//     }

//     if (!message || message.trim() === "") {
//       return res.status(400).json({ message: "Please enter a valid prompt" });
//     }

//     const currentProject = await prisma.websiteProject.findUnique({
//       where: { id: projectId, userId },
//       include: { versions: true },
//     });

//     if (!currentProject) {
//       return res.status(404).json({ message: "Please not found" });
//     }

//     await prisma.conversation.create({
//       data: {
//         role: "user",
//         content: message,
//         projectId,
//       },
//     });

//     await prisma.user.update({
//       where: { id: userId },
//       data: { credits: { decrement: 5 } },
//     });

//     const promptEnhanceResponse = await openai.chat.completions.create({
//       model: "z-ai/glm-4.5-air:free",
//       messages: [
//         {
//           role: "system",
//           content: `
// You are a prompt enhancement specialist. The user wants to make changes to their website. Enhance their request to be more specific and actionable for a web developer.

//     Enhance this by:
//     1. Being specific about what elements to change
//     2. Mentioning design details (colors, spacing, sizes)
//     3. Clarifying the desired outcome
//     4. Using clear technical terms

// Return ONLY the enhanced request, nothing else. Keep it concise (1-2 sentences).
//           `,
//         },
//         {
//           role: "user",
//           content: `User's request: "${message}"`,
//         },
//       ],
//     });

//     const enhancedPrompt = promptEnhanceResponse.choices[0].message.content;

//     await prisma.conversation.create({
//       data: {
//         role: "assistant",
//         content: `I've enhanced your prompt to: "${enhancedPrompt}"`,
//         projectId,
//       },
//     });

//     await prisma.conversation.create({
//       data: {
//         role: "assistant",
//         content: `Now making changes to website...`,
//         projectId,
//       },
//     });

//     const codeGenerationResponse = await openai.chat.completions.create({
//       model: "z-ai/glm-4.5-air:free",
//       messages: [
//         {
//           role: "system",
//           content: `
// You are an expert web developer.

//     CRITICAL REQUIREMENTS:
//     - Return ONLY the complete updated HTML code with the requested changes.
//     - Use Tailwind CSS for ALL styling (NO custom CSS).
//     - Use Tailwind utility classes for all styling changes.
//     - Include all JavaScript in <script> tags before closing </body>
//     - Make sure it's a complete, standalone HTML document with Tailwind CSS
//     - Return the HTML Code Only, nothing else

//     Apply the requested changes while maintaining the Tailwind CSS styling approach.
//           `,
//         },
//         {
//           role: "user",
//           content: `Here is current website code: "${currentProject.current_code}" The user wants this changes: "${enhancedPrompt}"`,
//         },
//       ],
//     });

//     const code = codeGenerationResponse.choices[0].message.content || "";

//     const versions = await prisma.version.create({
//       data: {
//         code: code
//           .replace(/^[a-z]*\n?/gi, "")
//           .replace(/`$/, "")
//           .trim(),
//         description: "Changes made",
//         projectId,
//       },
//     });

//     await prisma.conversation.create({
//       data: {
//         role: "assistant",
//         content: "I've made changes to your website! You can now preview it",
//         projectId,
//       },
//     });

//     await prisma.websiteProject.update({
//       where: { id: projectId },
//       data: {
//         current_code: code
//           .replace(/^[a-z]*\n?/gi, "")
//           .replace(/^$/, "")
//           .trim(),
//         current_version_index: versions.id,
//       },
//     });

//     res.json({ message: "Change make successfully" });
//   } catch (error: any) {
//     await prisma.user.update({
//       where: { id: userId },
//       data: { credits: { increment: 5 } },
//     });

//     console.log(error.code || error.message);
//     res.status(500).json({ message: error.message });
//   }
// };

// export const rollBackToVersion = async (req: Request, res: Response) => {
//   try {
//     const userId = req.userId;
//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }
//     const { projectId, versionId } = req.params;

//     const project = await prisma.websiteProject.findUnique({
//       where: { id: projectId, userId },
//       include: { versions: true },
//     });

//     if (!project) {
//       return res.status(404).json({ message: "Project not found" });
//     }

//     const version = project.versions.find((version) => {
//       version.id === versionId;
//     });

//     if (!version) {
//       return res.status(404).json({ message: "Version not found" });
//     }

//     await prisma.websiteProject.update({
//       where: { id: projectId, userId },
//       data: {
//         current_code: version.code,
//         current_version_index: version.id,
//       },
//     });

//     await prisma.conversation.create({
//       data: {
//         role: "assistant",
//         content:
//           "I've rolled back your website to selected version. You can now preview it",
//         projectId,
//       },
//     });

//     res.json({ message: "Version rolled back" });
//   } catch (error: any) {
//     console.log(error.code || error.message);
//     res.status(500).json({ message: error.message });
//   }
// };

// export const deleteProject = async (req: Request, res: Response) => {
//   try {
//     const userId = req.userId;
//     const { projectId } = req.params;

//     await prisma.websiteProject.delete({
//       where: { id: projectId, userId },
//     });

//     res.json({ message: "Project delete successfully" });
//   } catch (error: any) {
//     console.log(error.code || error.message);
//     res.status(500).json({ message: error.message });
//   }
// };

// export const getProjectPreview = async (req: Request, res: Response) => {
//   try {
//     const userId = req.userId;
//     const { projectId } = req.params;

//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const project = await prisma.websiteProject.findFirst({
//       where: { id: projectId, userId },
//       include: { versions: true },
//     });

//     if (!project) {
//       return res.status(404).json({ message: "Project not found" });
//     }

//     res.json({ project });
//   } catch (error: any) {
//     console.log(error.code || error.message);
//     res.status(500).json({ message: error.message });
//   }
// };

// export const getPublishedProject = async (req: Request, res: Response) => {
//   try {
//     const projects = await prisma.websiteProject.findMany({
//       where: { isPublished: true },
//       include: { user: true },
//     });

//     res.json({ projects });
//   } catch (error: any) {
//     console.log(error.code || error.message);
//     res.status(500).json({ message: error.message });
//   }
// };

// export const getProjectById = async (req: Request, res: Response) => {
//   try {
//     const { projectId } = req.params;

//     const project = await prisma.websiteProject.findFirst({
//       where: { id: projectId },
//     });

//     if (!project || project.isPublished === false || !project?.current_code) {
//       return res.status(404).json({ message: "Project not found" });
//     }

//     res.json({ code: project.current_code });
//   } catch (error: any) {
//     console.log(error.code || error.message);
//     res.status(500).json({ message: error.message });
//   }
// };

// export const saveProjectCode = async (req: Request, res: Response) => {
//   try {
//     const userId = req.userId;
//     const { projectId } = req.params;

//     const { code } = req.body;

//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     if (!code) {
//       return res.status(400).json({ message: "Code is required" });
//     }

//     const project = await prisma.websiteProject.findUnique({
//       where: { id: projectId, userId },
//     });

//     if (!project) {
//       return res.status(404).json({ message: "Project not found" });
//     }

//     await prisma.websiteProject.update({
//       where: { id: projectId },
//       data: { current_code: code, current_version_index: "" },
//     });

//     res.json({ message: "Project saved successfully" });

//     res.json({ code: project.current_code });
//   } catch (error: any) {
//     console.log(error.code || error.message);
//     res.status(500).json({ message: error.message });
//   }
// };
