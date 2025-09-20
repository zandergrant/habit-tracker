document.addEventListener('DOMContentLoaded', () => {
    const habitForm = document.getElementById('habit-form');
    const habitInput = document.getElementById('habit-input');
    const habitList = document.getElementById('habit-list');

    // Load habits from local storage when the page loads
    loadHabits();

    habitForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent page reload on form submission
        const habitText = habitInput.value.trim();

        if (habitText !== '') {
            addHabit(habitText);
            habitInput.value = ''; // Clear the input field
            saveHabits();
        }
    });

    // Add a habit to the DOM
    function addHabit(text, isCompleted = false) {
        const li = document.createElement('li');
        li.className = 'habit-item';
        if (isCompleted) {
            li.classList.add('completed');
        }

        // Create the habit text span
        const habitTextSpan = document.createElement('span');
        habitTextSpan.className = 'habit-text';
        habitTextSpan.textContent = text;
        habitTextSpan.addEventListener('click', () => {
            li.classList.toggle('completed');
            saveHabits();
        });

        // Create the actions div for buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions';

        // Create the complete button
        const completeBtn = document.createElement('button');
        completeBtn.className = 'complete-btn';
        completeBtn.innerHTML = '<i class="fas fa-check-circle"></i>';
        completeBtn.addEventListener('click', () => {
            li.classList.toggle('completed');
            saveHabits();
        });

        // Create the delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.addEventListener('click', () => {
            li.remove();
            saveHabits();
        });
        
        actionsDiv.appendChild(completeBtn);
        actionsDiv.appendChild(deleteBtn);
        
        li.appendChild(habitTextSpan);
        li.appendChild(actionsDiv);

        habitList.appendChild(li);
    }

    // Save all habits to local storage
    function saveHabits() {
        const habits = [];
        document.querySelectorAll('.habit-item').forEach(item => {
            habits.push({
                text: item.querySelector('.habit-text').textContent,
                completed: item.classList.contains('completed')
            });
        });
        localStorage.setItem('habits', JSON.stringify(habits));
    }

    // Load habits from local storage and display them
    function loadHabits() {
        const habits = JSON.parse(localStorage.getItem('habits'));
        if (habits) {
            habits.forEach(habit => addHabit(habit.text, habit.completed));
        }
    }
});
