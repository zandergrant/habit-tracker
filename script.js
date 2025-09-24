// Add a new habit to Firestore
habitForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // <-- THIS LINE IS THE KEY
    
    const habitText = habitInput.value.trim();
    if (habitText !== '' && currentUser) {
        try {
            await addDoc(collection(db, 'habits'), {
                text: habitText,
                completed: false,
                uid: currentUser.uid
            });
            habitInput.value = '';
        } catch (error) {
            console.error("Error adding document: ", error);
        }
    }
});
