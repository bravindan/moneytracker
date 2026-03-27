So, the real app should be app to do the following, allow me to create a new monthly records, allowing me input the amount that I have earned that month as my income, then prompts me for inputing the % I want to or have used for certain things majorly savings and investments, expenditure for that month and then automatically give the calculated figure based on the income I inputed. after deciding the expenditure, I can then see the balance of my money after the month.remaining the amounts, that is the amount allocated for the expenses of that month and savings and investments, it should tell me the balance. the dashboard should show monthly data but the app should have a way of creating new data every month, meaning every month the dashboard resets until i input the new figures for the month. I should also be able to filter by month to decide what data I want show on the dashboard.

## Google OAuth Setup

Google sign-in requires these environment variables in `.env`:

- `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID` (Android)
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS` (iOS)

Notes:

- Web client ID is required for token exchange and Firebase credential handling.
- Android and iOS each need their platform-specific OAuth client ID.
- If a value is left blank, the app will show a setup hint on the login screen.
