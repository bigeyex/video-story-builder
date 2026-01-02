build a AI video story builder.
It is based on Electron. Use react and Ant Design for front-end. User can create/edit/delete projects, which will be saved locally as JSON files.
After enter each project, User can switch between "World Settings", "Characters", "Scenes" modules with icons on the thin bar on the left-most side. on the bottom of the bar is a setting icon, which user can set AI Models and API keys. for now, only support VolcEngine API, whose doc can be found at: https://www.volcengine.com/docs/82379/1399008. 

# World Settings
User can set target audience, art style and summary of story(genre and time period), each in multi-line plain text. when each field is highlighted, display some examples on the right side panel (and fill in example by clicking them)

# Characteers
User can add/delete characters and set their relations with a graph editor. Each character node has a name and an avatar and relationship is shown as edges, editable by double clicking. when each character is highlighted, user can edit their background, personality and Appearance in text boxes through a panel to the right. User can also let AI generate one by clicking a button on the right-sidebar, which will show 10 candidates on a popup window.

Keep all AI prompts in a dedicated folder for better architecture. If API_KEY is not set, prompt the user with a modal dialog. API Keys are stored in User's home Folder (use electron) and shared among projects. 

Back to character setting. Character also have an avatar and a character design sheet with three-views. They will be used in scene generation, and can be uploaded or AI-generated from descriptions above with a button click.

# Scenes
Additional chapter list will be shown as a left side panel. Main content area shows "story outline" and "conflict" of this chapter as left-right text boxes, followed by a standard storyboard: each row has a picture, description of shot, dialogue, duration(seconds), camera moves, and sound/music. user can upload a picture or fill in text boxes, or click AI generate button to generate these of a whole chapter based on "story outline" and "conflict" (when generating, characters+relationships and world settings will be taken into consideration). pictures are generated with a second button, for image generation costs more. Another AI-generation button is for generating a video of this chapter, taking account of images of shots.

when expanded, a character list will be shown on the right to help writing.
User can also generate a multiple chapters by clicking a button on the chapters-list-sidebar. 
