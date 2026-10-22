const Project = require("../Models/project");
const User = require("../Models/user");
const mongoose = require("mongoose");
const { randomUUID } = require("node:crypto");

const GENERATION_COST = 50;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `
You are WEBLOOM AI — an award-winning digital art director, expert front-end engineer,
and conversion-focused UX designer. You build distinctive websites with the level of
craft expected from a premium independent design studio, not generic AI templates.

MISSION AND SCOPE
- Your ONLY task is to create or modify the website requested by the user.
- Infer a coherent brand direction from a short prompt. Do not ask follow-up questions
  unless the missing detail genuinely prevents generation.
- Make the design feel commissioned specifically for this business, audience and goal.
- Prioritize real visual quality and complete functionality over superficial complexity.

ABSOLUTE TECHNOLOGY CONTRACT
- Output ONE complete HTML5 document using HTML, handcrafted CSS and vanilla JavaScript.
- No React, JSX, Tailwind, Bootstrap, component libraries, icon libraries, build tools,
  external stylesheets, external fonts, scripts from CDNs, or dependencies.
- Exactly ONE <style> element containing ALL CSS and ONE <script> element containing ALL JS.
- Include <!DOCTYPE html>, html lang, charset, viewport, a meaningful title and meta description.
- Use high-quality system font stacks and smart typographic weights, sizes and letter spacing.
- The page MUST render inside iframe srcdoc with no backend and no build step.
- Return complete working HTML, NEVER a fragment, pseudo-code or scaffold.

DESIGN DIRECTION — THIS IS YOUR MAIN PRIORITY
Before writing code, silently determine a single distinctive visual concept:
1. Identify the brand category, desired emotion, target visitor and primary CTA.
2. Choose an intentional art direction suited to that category:
   editorial minimalism, warm artisan, elegant luxury, bold contemporary,
   friendly consumer, expressive creative, refined technology, etc.
3. Establish an intentional palette: restrained primary, accent, muted and surface
   colors; avoid random neon gradients and generic dark-purple SaaS styling unless fitting.
4. Build a visual rhythm: contrast large and compact areas, generous white space,
   varied content widths, asymmetric compositions and purposeful visual focal points.
5. Make the FIRST SCREEN exceptional: memorable navigation, a powerful headline,
   well-written supporting copy, obvious CTA and an art-directed hero visual.

MANDATORY VISUAL CRAFT
- Use a cohesive CSS design system in :root with colors, spacing, radii, shadows and transitions.
- Typography: clear display/body scale with clamp(), balanced line lengths, hierarchy,
  tight headline tracking and readable body line-height.
- Layout: max-width container, controlled grid, considered negative space and alignment.
- Distinctive components: editorial sections, tailored feature blocks, varied card sizes,
  layered image crops, art-directed banners, alternating compositions and rich footer.
- Refined details: thin borders, tasteful shadows, subtle gradients when appropriate,
  refined hover/active states and contextual micro-interactions.
- Use polished CSS animation sparingly: restrained entrances, hover lifts, subtle orbits,
  underline transitions, shimmer or parallax-like effects only when they fit the brand.
- Respect prefers-reduced-motion and keep mobile performance smooth.
- NEVER return a plain header + 3 identical cards + generic testimonials + plain footer.
- NEVER reuse the same visual composition for unrelated industries.
- Do not default to basic 8px-radius cards, giant flat color rectangles, boring stock layouts,
  unstyled text, generic centered hero sections or unrelated decorative blobs.
- Implement a visually polished, believable final page; do not spend all tokens on explanation.

CONTENT AND INFORMATION ARCHITECTURE
- Generate precise, compelling, industry-specific copy. No lorem ipsum or vague filler.
- Include enough substantive, relevant content to feel complete. Typically a strong
  hero, brand/story, curated offerings, differentiators, visual showcase, CTA and footer,
  but adapt to the business rather than forcing the same sections each time.
- Only create a multi-page SPA if the user requests multiple pages; otherwise prioritize
  a beautiful, cohesive landing page with working section navigation.
- Never invent verifiable claims: real reviews, awards, years in business, client logos,
  exact addresses, delivery times or contact details. Omit them or mark sample content
  clearly rather than fabricating facts.
- Primary CTAs should lead somewhere meaningful inside the demo.
- No dead # links, missing anchor IDs, fake payments or false form-submission success.
- Where backend functionality would be required, offer a believable front-end-only
  demonstration and be clear when nothing is transmitted.

PHOTOGRAPHY AND VISUAL ASSETS
- Photos MUST directly match their section and exact item: a pizza product gets pizza,
  restaurant ambiance gets restaurant interior, a destination gets that destination.
- Prefer a small number of striking, carefully cropped, relevant photographs over a
  grid of interchangeable stock photos. Use consistent aspect ratios and object-fit.
- External photography is allowed only from known images.unsplash.com photo URLs with
  appropriate parameters such as auto=format&fit=crop&w=1200&q=80.
- Never invent Unsplash IDs or assert that an unverified URL works. If no trustworthy
  photo URL is known, create an intentionally designed CSS illustration or visual
  composition rather than risking a broken image.
- Add descriptive alt text, loading=lazy below the fold, width and height where suitable.
- Do not repeat the same image for unrelated items.

RESPONSIVE AND ACCESSIBLE BY DESIGN
- Mobile first. Test mentally at 360px, 390px, 768px, 1024px and 1440px.
- Use flex/grid, minmax(), clamp(), percentages and responsive media queries.
- Prevent horizontal scrolling. Images must not overflow and text must wrap safely.
- Mobile navigation must open/close, be keyboard operable, and have clear active state.
- Buttons and links need comfortable touch targets, keyboard focus and readable contrast.
- Use semantic header/nav/main/section/footer, meaningful labels and alt attributes.
- All interactive controls must work with vanilla JS; handle invalid input clearly.

IMPLEMENTATION QUALITY
- Write readable, well-indented HTML, CSS and JS; never intentionally minify.
- Use properly named CSS classes, custom properties and clear JS event handling.
- Organize CSS into logical groups (global, header, hero, sections, responsive).
- Use addEventListener instead of inline onclick where possible.
- Make no external API calls, no fake checkout flows, no misleading forms.
- Avoid layout shifts, unnecessary expensive effects and broken mobile menus.
- If the user supplies existing HTML, preserve unrelated content, design and behavior.
  Return the entire updated HTML document rather than a patch.

PRIVATE SELF-REVIEW BEFORE RETURNING
Check for a strong, non-generic first impression; consistent design language;
meaningful text; responsive 360px/mobile layout; working menu and CTA anchors;
valid HTML/CSS/JS; exact one style and one script; no fake actions or broken links.
If the site still looks like a basic template, substantially improve its composition,
typography, spacing, details and imagery BEFORE producing the final answer.

STRICT RESPONSE FORMAT
Return exactly one valid JSON object and NOTHING else:
{
  "message": "Short human-friendly confirmation or change summary",
  "code": "<!DOCTYPE html>...FULL HTML DOCUMENT..."
}
The code value must contain HTML directly, NOT nested JSON. Escape all JSON
special characters correctly. No markdown fences, preambles, prefixes, or
additional keys. Never include instructions or commentary outside this JSON.
`;


class AIOutputError extends Error {
    constructor(message) {
        super(message);
        this.name = "AIOutputError";
    }
}

const normalizeJSON = (text) =>
    text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .replace(/^on\s*\n(?=\s*\{)/i, "")
        .trim();

const parseAIResponse = (rawContent) => {
    if (typeof rawContent !== "string" || !rawContent.trim()) {
        throw new AIOutputError("AI returned an empty response");
    }

    let value = rawContent;

    // Accept normal JSON and the accidentally double-encoded JSON seen before.
    for (let attempt = 0; attempt < 3; attempt += 1) {
        let parsed;

        try {
            parsed = JSON.parse(normalizeJSON(value));
        } catch {
            throw new AIOutputError("AI returned invalid JSON");
        }

        if (typeof parsed === "string") {
            value = parsed;
            continue;
        }

        if (!parsed || typeof parsed.code !== "string") {
            throw new AIOutputError("AI response is missing the code property");
        }

        const html = parsed.code.trim();

        if (html.startsWith("{")) {
            value = html;
            continue;
        }

        const requiredTags = [
            /^<!doctype html>/i,
            /<html\b/i,
            /<head\b/i,
            /<body\b/i,
            /<\/html\s*>\s*$/i,
        ];

        if (!requiredTags.every((pattern) => pattern.test(html))) {
            throw new AIOutputError("AI returned an incomplete HTML document");
        }

        if (html.length > 500000) {
            throw new AIOutputError("Generated HTML exceeds the allowed size");
        }

        const styleCount = (html.match(/<style\b[^>]*>/gi) || []).length;
        const scriptCount = (html.match(/<script\b[^>]*>/gi) || []).length;

        if (styleCount !== 1 || scriptCount !== 1) {
            throw new AIOutputError("AI must return one style tag and one script tag");
        }

        return {
            message:
                typeof parsed.message === "string" && parsed.message.trim()
                    ? parsed.message.trim()
                    : "Website generated successfully",
            code: html,
        };
    }

    throw new AIOutputError("AI response contained nested JSON instead of HTML");
};

const getAuthenticatedUserId = (req) => req.user?._id || req.user?.id;

const generateWebsite = async (req, res) => {
    let reservedCredits = false;
    let userId;

    try {
        const { prompt, projectId } = req.body || {};
        userId = getAuthenticatedUserId(req);

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized user" });
        }

        if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 10000) {
            return res.status(400).json({
                success: false,
                message: "Prompt is required (maximum 10000 characters)",
            });
        }

        if (!process.env.OPEN_ROUTER_API_KEY) {
            return res.status(500).json({
                success: false,
                message: "OpenRouter API key is missing",
            });
        }

        let project = null;

        if (projectId) {
            if (!mongoose.isValidObjectId(projectId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid project ID",
                });
            }

            project = await Project.findOne({ _id: projectId, user: userId });

            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: "Project not found",
                });
            }
        }

        // Atomic reservation: concurrent requests cannot spend the same 50 credits.
        const chargedUser = await User.findOneAndUpdate(
            { _id: userId, credits: { $gte: GENERATION_COST } },
            { $inc: { credits: -GENERATION_COST } },
            { new: true, projection: { credits: 1 } }
        );

        if (!chargedUser) {
            const accountExists = await User.exists({ _id: userId });

            return res.status(accountExists ? 403 : 401).json({
                success: false,
                message: accountExists
                    ? `Insufficient credits. ${GENERATION_COST} credits are required.`
                    : "User account not found",
                requiredCredits: GENERATION_COST,
            });
        }

        reservedCredits = true;

        const messages = [{ role: "system", content: SYSTEM_PROMPT }];

        if (project?.latestCode) {
            messages.push({
                role: "user",
                content: `This is the CURRENT HTML website:\n\n${project.latestCode}\n\nApply my next request to this existing website. Preserve unrelated parts. Return the full updated HTML in the required JSON format.`,
            });
        }

        messages.push({ role: "user", content: prompt.trim() });

        const response = await fetch(OPENROUTER_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "deepseek/deepseek-chat",
                messages,
                stream: false,
                temperature: 0.7,
                max_tokens: 12000,
                // Enable response_format: { type: "json_object" } only if
                // your selected OpenRouter model/provider supports it.
            }),
            signal: AbortSignal.timeout(180000),
        });

        if (!response.ok) {
            console.error("OpenRouter Error:", response.status, await response.text());
            throw new AIOutputError("OpenRouter could not generate the website");
        }

        const aiData = await response.json();
        const choice = aiData.choices?.[0];

        if (choice?.finish_reason === "length") {
            throw new AIOutputError("AI response was truncated. Try a smaller request.");
        }

        const generated = parseAIResponse(choice?.message?.content);

        if (project) {
            project.latestCode = generated.code;
            project.conversation.push(
                { role: "user", content: prompt.trim() },
                { role: "ai", content: generated.code }
            );

            await project.save();
        } else {
            const title = prompt.trim().slice(0, 60);
            const slugBase =
                title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
                "website";

            project = await Project.create({
                user: userId,
                title,
                slug: `${slugBase}-${randomUUID().slice(0, 8)}`,
                latestCode: generated.code,
                conversation: [
                    { role: "user", content: prompt.trim() },
                    { role: "ai", content: generated.code },
                ],
                deployed: false,
            });
        }

        // Charge is final only after the project has been saved successfully.
        reservedCredits = false;

        return res.status(200).json({
            success: true,
            message: generated.message,
            projectId: project._id,
            title: project.title,
            code: generated.code,
            creditsDeducted: GENERATION_COST,
            remainingCredits: chargedUser.credits,
        });
    } catch (error) {
        console.error("Generate Website Error:", error);

        if (reservedCredits) {
            try {
                await User.updateOne(
                    { _id: userId },
                    { $inc: { credits: GENERATION_COST } }
                );
            } catch (refundError) {
                // Reconcile this manually: a crash or failed refund needs a ledger.
                console.error("CRITICAL: Credit refund failed for user", userId, refundError);
                return res.status(500).json({
                    success: false,
                    message: "Generation failed and credit refund could not be confirmed. Contact support.",
                });
            }
        }

        const status =
            error.name === "TimeoutError" || error.name === "AbortError"
                ? 504
                : error instanceof AIOutputError
                  ? 502
                  : 500;

        return res.status(status).json({
            success: false,
            message:
                status === 500
                    ? "Failed to save the generated website"
                    : error.message,
            creditsDeducted: 0,
        });
    }
};

const getProjects = async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized user" });
        }

        const projects = await Project.find({ user: userId })
            .select("title slug deployed deployURL createdAt updatedAt")
            .sort({ updatedAt: -1 })
            .lean();

        return res.status(200).json({ success: true, projects });
    } catch (error) {
        console.error("Get Projects Error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch projects" });
    }
};

const getProjectById = async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { projectId } = req.params;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized user" });
        }

        if (!mongoose.isValidObjectId(projectId)) {
            return res.status(400).json({ success: false, message: "Invalid project ID" });
        }

        const project = await Project.findOne({ _id: projectId, user: userId });

        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        return res.status(200).json({ success: true, project });
    } catch (error) {
        console.error("Get Project Error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch project" });
    }
};

const updateProject = async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { projectId } = req.params;
        const { title, latestCode } = req.body || {};

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized user" });
        }

        if (!mongoose.isValidObjectId(projectId)) {
            return res.status(400).json({ success: false, message: "Invalid project ID" });
        }

        const updates = {};

        if (title !== undefined) {
            if (typeof title !== "string" || !title.trim() || title.length > 120) {
                return res.status(400).json({ success: false, message: "Invalid title" });
            }
            updates.title = title.trim();
        }

        if (latestCode !== undefined) {
            if (
                typeof latestCode !== "string" ||
                !/^<!doctype html>/i.test(latestCode.trim()) ||
                latestCode.length > 500000
            ) {
                return res.status(400).json({ success: false, message: "Invalid HTML code" });
            }
            updates.latestCode = latestCode.trim();
        }

        if (!Object.keys(updates).length) {
            return res.status(400).json({ success: false, message: "No supported changes provided" });
        }

        // Manual saves/renames use no AI and therefore do not cost credits.
        const project = await Project.findOneAndUpdate(
            { _id: projectId, user: userId },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        return res.status(200).json({ success: true, project });
    } catch (error) {
        console.error("Update Project Error:", error);
        return res.status(500).json({ success: false, message: "Failed to update project" });
    }
};

const deleteProject = async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { projectId } = req.params;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized user" });
        }

        if (!mongoose.isValidObjectId(projectId)) {
            return res.status(400).json({ success: false, message: "Invalid project ID" });
        }

        const project = await Project.findOneAndDelete({ _id: projectId, user: userId });

        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }

        return res.status(200).json({ success: true, message: "Project deleted successfully" });
    } catch (error) {
        console.error("Delete Project Error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete project" });
    }
};



const deploy = async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { projectId } = req.params;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized user",
            });
        }

        if (!mongoose.isValidObjectId(projectId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID",
            });
        }

        const project = await Project.findOne({ _id: projectId, user: userId });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found",
            });
        }

        // Check whether the project has generated HTML
        if (!project.latestCode?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Generate a website before deploying",
            });
        }

        const frontendURL = process.env.FRONTEND_URL?.trim().replace(/\/+$/, "");

        if (!frontendURL) {
            return res.status(500).json({
                success: false,
                message: "Frontend URL is not configured",
            });
        }

        // Generate a slug only if one does not exist
        if (!project.slug) {
            const slugBase =
                project.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "") || "website";

            project.slug = `${slugBase}-${randomUUID().slice(0, 8)}`;
        }

        project.deployed = true;
        project.deployURL = `${frontendURL}/site/${encodeURIComponent(project.slug)}`;

        await project.save();

        return res.status(200).json({
            success: true,
            message: "Project deployed successfully",
            deployed: project.deployed,
            deployURL: project.deployURL,
            slug: project.slug,
        });

    } catch (error) {
        console.error("Deploying Project Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to deploy project",
        });
    }
};


const getDeployedWebsite = async (req, res) => {
    try {
        const { slug } = req.params;

        const project = await Project.findOne({
            slug,
            deployed: true,
        }).select("title latestCode");

        if (!project || !project.latestCode) {
            return res.status(404).json({
                success: false,
                message: "Website not found",
            });
        }

        return res.status(200).json({
            success: true,
            title: project.title,
            code: project.latestCode,
        });

    } catch (error) {
        console.error("Get Deployed Website Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load website",
        });
    }
};




module.exports = {
    generateWebsite,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
    deploy,
    getDeployedWebsite
};

