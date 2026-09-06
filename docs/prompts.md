# Basic knowledge
I am a business development manager. I have a boss and some clients on my hand. I want to build an app which help me running my daily activities. Sometimes I forget on some action items to be done, follow up, or whatever that I should do. So, based on my notes, the app should help me to setup priorities, make reminder, and later on send alert or WhatsApp message, generate dashboard, etc. I wish to be connected to an LLM to help me with some tasks which I think won't be easy to be translated into code.

In basic, it will be used to write notes. It will be a free text just like google keep or apple notes. It will then analyze the submitted notes. It should be able to figure out which one is 1 whole sentence and prompt it to the user for each detected sentence and ask the user for the action to be taken regarding the sentence. So the user will have 1 or more prompt depending on the number of sentence found.

# Task 1
## Context
I want you to tell me what's your plan based on the basic knowledge above. In addition, also try to analize `example1.txt` file as it is 1 sample note I have recently. The example is just 1 format, I may wildly write something with different format.

Put your summary into a markdown file, let's name it task1.md.
<!-- End of task 1 -->

# Task 2
## Context
Now, I want you to create a simple web page as a POC. I will need to have something basic but quite pretty for me to see. It will be the visualization of your summary on task1.md

The page hierarchy :
1. Title, which is `My Productivity Tool`
2. A free note area. For now, you can consider using textarea
3. `Notes Breakdown` area. I will explain this area further below.

So, for every 1 sentence, I want you to build a card.

## Technical note for the page
1. Use Tailwind CSS through CDN
2. Use jQuery through CDN, keep all functions / else in a file named `script.js`
3. Use third minor scale
4. All content will be wrapped inside a container div
5. Responsive design
6. Light blue background
7. Professional look

## Technical note for the card
1. White background
2. Proportional border radius
3. First content is the detected sentence
4. Next is some questions which should be answered by the user to determine what the app will do on the sentence.

## Questions which I have in mind for now
1. "The detected client is [something in bold]. Is this correct ?" -> this question is to classified the client. If the client is not registered yet, there should be an option to create new client. A modal box will be shown to enter the new client
2. "Which project of [client name] this note for ?" -> a searchable drop down
3. "Is this an action item ?" -> yes/no question

If no 2 is "NO", it will be saved as a note only

If no 2 is "YES", show a form to :
1. Choose the priority ( the range will be 1 - 5 )
2. Setup the deadline

On this part, I need you to be creative on how it should be shown in a simple, yet elegant way
<!-- End of task 2 -->

# Task 3
## Context
Act as a business development manager or someone who work on an agency, and you need to help your clients with their needs. I want you to analyze my questions on `Task 2`. Am I already asking the right questions ? Or are there any other good questions to every sentence ? The main point is I wish to get help from the app on what to decide on each sentence
<!-- End of task 3 -->

# Task 4
## Context
Now, based on `task3.md` I want you to make improvements to `client` folder. This folder contain our running POC to build this app. Things to improve :

- I want to take decission / action for every sentence in a modal box, make it looks professional
- I want to start to use something persistence to store the decissions. For now, let's use localStorage
- I want the data stored as JSON, you may advice me on the JSON format
- Later on, I want you to visualize the JSON into a table. Ordered by priorities and urgencies

During the process I want you to ask me on what columns will you built for the table, or maybe there's something else that you want to ask me for confirmation
<!-- End of task 4 -->

# Task 5
## Context
I want you to change the behavior on the front end. Currently, it will show all the predicted sentence and the user have to click the button to show the modal box and do some actions. Now, if the user click on the `analyzeBtn` I want you to automatically run through all the predicted sentence and show me the modal for 1 sentence at a time. So eventually, all predicted sentence will be followed up. So, later, below the `analyzeBtn` we will directly see the table instead of having all of the predicted sentence

As usual, ask me questions for unsure things
<!-- End of task 5 -->

# Task 6
## Context
I want some adjustments :
1. I want to update the whole design scale into `perfect fourth` scale
2. I want to have the ability to update the predicted sentence. I'm thinking to show the predicted sentence on a textarea, so the user can update the sentence when the decision modal is showing

Ask me questions for uncertain things
<!-- End of task 6 -->

# Task 7
## Context
I want to update whole app data. For now, remove :
- Type
- Status
- Who Acts
and all the codes which related to those column
<!-- End of Task 7 -->

# Task 8
## Context
I want you to update the whole app. Action types are now :
- "Meeting", this will lead to schedule setup step
- "Search Vendor", this will lead to a step to enter a note regarding the vendor
- "Hold", this will only set the action into hold state
- "Reject", this will only set the action into reject state

The rest of the functionality remain unchanged
<!-- End of Task 8 -->

# Task 9
## Context
I want you to analyze the flow of the wizard for every sentence. I want you to advice me whether it is already good.

If you have any better idea based on similar app out there, propose the features to me. Specially following the new action types
<!-- End of Task 9 -->

# Task 10
## Context
Improve the wizard and saved data while keeping the current core flow: one sentence at a time, client/campaign context, then an action choice.

1. Add a **Skip for now** option to every sentence decision. It must not discard the sentence. Save it as a pending decision so I can review it later, and move immediately to the next detected sentence.
2. Improve **Hold** so it is a snooze instead of a permanent dead end. Ask for an optional reason and a required **Review on** date. Keep held items out of the active table until that date, then make them available for review again.
3. Improve **Reject** so it is reversible. Ask for an optional rejection reason. Keep rejected items out of the active table, but retain them in storage and provide a way to restore them.
4. For **Meeting**, separate the scheduled meeting date/time from the work deadline. Keep the existing deadline field as the preparation deadline, and label it clearly. The meeting schedule fields must remain separate in the data and UI.
5. Add reminders before any WhatsApp integration. Support an optional reminder date and time for Meeting and Search Vendor actions. Store it in the item JSON and show it in the saved-items table. Browser notifications are not required yet; this task is only for collecting, storing, and displaying reminder data.

Keep the existing styling, localStorage persistence, automatic sentence-by-sentence flow, and current action types. Migrate existing localStorage records safely so new fields have sensible empty values and no saved items are lost.
<!-- End of Task 10 -->
