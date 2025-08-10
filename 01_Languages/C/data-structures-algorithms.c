/**
 * C Programming Demonstration
 * Showcasing memory management, pointers, data structures, and algorithms
 * Author: Bodheesh VC
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

// 1. Structure Definitions
typedef struct {
    int id;
    char name[50];
    char email[100];
    char skills[200];
    float salary;
} Developer;

typedef struct Node {
    Developer data;
    struct Node* next;
} Node;

typedef struct {
    Node* head;
    int size;
} LinkedList;

typedef struct {
    Developer* developers;
    int capacity;
    int size;
} DynamicArray;

// 2. Function Prototypes
LinkedList* createLinkedList();
void insertDeveloper(LinkedList* list, Developer dev);
void displayDevelopers(LinkedList* list);
Developer* findDeveloperById(LinkedList* list, int id);
void freeDeveloperList(LinkedList* list);

DynamicArray* createDynamicArray(int initialCapacity);
void addDeveloper(DynamicArray* arr, Developer dev);
void resizeArray(DynamicArray* arr);
void sortDevelopersBySalary(DynamicArray* arr);
void freeDynamicArray(DynamicArray* arr);

// 3. Memory Management Functions
void* safeMalloc(size_t size) {
    void* ptr = malloc(size);
    if (ptr == NULL) {
        fprintf(stderr, "Memory allocation failed!\n");
        exit(EXIT_FAILURE);
    }
    return ptr;
}

char* safeStringCopy(const char* source) {
    if (source == NULL) return NULL;
    
    size_t len = strlen(source) + 1;
    char* copy = (char*)safeMalloc(len);
    strcpy(copy, source);
    return copy;
}

// 4. Linked List Implementation
LinkedList* createLinkedList() {
    LinkedList* list = (LinkedList*)safeMalloc(sizeof(LinkedList));
    list->head = NULL;
    list->size = 0;
    return list;
}

void insertDeveloper(LinkedList* list, Developer dev) {
    Node* newNode = (Node*)safeMalloc(sizeof(Node));
    newNode->data = dev;
    newNode->next = list->head;
    list->head = newNode;
    list->size++;
    
    printf("Developer %s added to the list.\n", dev.name);
}

void displayDevelopers(LinkedList* list) {
    printf("\n=== Developer List ===\n");
    Node* current = list->head;
    int index = 1;
    
    while (current != NULL) {
        printf("%d. ID: %d, Name: %s, Email: %s\n", 
               index++, current->data.id, current->data.name, current->data.email);
        printf("   Skills: %s\n", current->data.skills);
        printf("   Salary: $%.2f\n\n", current->data.salary);
        current = current->next;
    }
}

Developer* findDeveloperById(LinkedList* list, int id) {
    Node* current = list->head;
    while (current != NULL) {
        if (current->data.id == id) {
            return &(current->data);
        }
        current = current->next;
    }
    return NULL;
}

void freeDeveloperList(LinkedList* list) {
    Node* current = list->head;
    while (current != NULL) {
        Node* temp = current;
        current = current->next;
        free(temp);
    }
    free(list);
}

// 5. Dynamic Array Implementation
DynamicArray* createDynamicArray(int initialCapacity) {
    DynamicArray* arr = (DynamicArray*)safeMalloc(sizeof(DynamicArray));
    arr->developers = (Developer*)safeMalloc(sizeof(Developer) * initialCapacity);
    arr->capacity = initialCapacity;
    arr->size = 0;
    return arr;
}

void resizeArray(DynamicArray* arr) {
    int newCapacity = arr->capacity * 2;
    Developer* newArray = (Developer*)realloc(arr->developers, sizeof(Developer) * newCapacity);
    
    if (newArray == NULL) {
        fprintf(stderr, "Failed to resize array!\n");
        exit(EXIT_FAILURE);
    }
    
    arr->developers = newArray;
    arr->capacity = newCapacity;
    printf("Array resized to capacity: %d\n", newCapacity);
}

void addDeveloper(DynamicArray* arr, Developer dev) {
    if (arr->size >= arr->capacity) {
        resizeArray(arr);
    }
    
    arr->developers[arr->size] = dev;
    arr->size++;
}

// 6. Sorting Algorithm (Quick Sort)
int partition(Developer arr[], int low, int high) {
    float pivot = arr[high].salary;
    int i = (low - 1);
    
    for (int j = low; j <= high - 1; j++) {
        if (arr[j].salary >= pivot) { // Sort in descending order
            i++;
            Developer temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    }
    
    Developer temp = arr[i + 1];
    arr[i + 1] = arr[high];
    arr[high] = temp;
    
    return (i + 1);
}

void quickSort(Developer arr[], int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}

void sortDevelopersBySalary(DynamicArray* arr) {
    if (arr->size > 1) {
        quickSort(arr->developers, 0, arr->size - 1);
        printf("Developers sorted by salary (descending).\n");
    }
}

void freeDynamicArray(DynamicArray* arr) {
    free(arr->developers);
    free(arr);
}

// 7. Hash Table Implementation (Simple)
#define HASH_TABLE_SIZE 101

typedef struct HashNode {
    int key;
    Developer value;
    struct HashNode* next;
} HashNode;

typedef struct {
    HashNode* buckets[HASH_TABLE_SIZE];
} HashTable;

unsigned int hash(int key) {
    return key % HASH_TABLE_SIZE;
}

HashTable* createHashTable() {
    HashTable* table = (HashTable*)safeMalloc(sizeof(HashTable));
    for (int i = 0; i < HASH_TABLE_SIZE; i++) {
        table->buckets[i] = NULL;
    }
    return table;
}

void hashInsert(HashTable* table, int key, Developer dev) {
    unsigned int index = hash(key);
    HashNode* newNode = (HashNode*)safeMalloc(sizeof(HashNode));
    newNode->key = key;
    newNode->value = dev;
    newNode->next = table->buckets[index];
    table->buckets[index] = newNode;
}

Developer* hashSearch(HashTable* table, int key) {
    unsigned int index = hash(key);
    HashNode* current = table->buckets[index];
    
    while (current != NULL) {
        if (current->key == key) {
            return &(current->value);
        }
        current = current->next;
    }
    return NULL;
}

// 8. File I/O Operations
void saveDevelopersToFile(DynamicArray* arr, const char* filename) {
    FILE* file = fopen(filename, "wb");
    if (file == NULL) {
        fprintf(stderr, "Error opening file for writing: %s\n", filename);
        return;
    }
    
    // Write array size first
    fwrite(&arr->size, sizeof(int), 1, file);
    
    // Write developer data
    fwrite(arr->developers, sizeof(Developer), arr->size, file);
    
    fclose(file);
    printf("Developers saved to file: %s\n", filename);
}

DynamicArray* loadDevelopersFromFile(const char* filename) {
    FILE* file = fopen(filename, "rb");
    if (file == NULL) {
        fprintf(stderr, "Error opening file for reading: %s\n", filename);
        return NULL;
    }
    
    int size;
    fread(&size, sizeof(int), 1, file);
    
    DynamicArray* arr = createDynamicArray(size);
    fread(arr->developers, sizeof(Developer), size, file);
    arr->size = size;
    
    fclose(file);
    printf("Developers loaded from file: %s\n", filename);
    return arr;
}

// 9. String Manipulation Functions
void processSkillString(char* skills, char result[][50], int* count) {
    *count = 0;
    char* token = strtok(skills, ",");
    
    while (token != NULL && *count < 10) {
        // Remove leading/trailing spaces
        while (*token == ' ') token++;
        
        int len = strlen(token);
        while (len > 0 && token[len-1] == ' ') {
            token[len-1] = '\0';
            len--;
        }
        
        strcpy(result[*count], token);
        (*count)++;
        token = strtok(NULL, ",");
    }
}

// 10. Advanced Pointer Operations
void swapDevelopers(Developer* a, Developer* b) {
    Developer temp = *a;
    *a = *b;
    *b = temp;
}

void demonstratePointers() {
    printf("\n=== Pointer Demonstration ===\n");
    
    Developer dev1 = {1, "Bodheesh VC", "bodheesh@example.com", "JavaScript,React,Node.js", 85000.0};
    Developer dev2 = {2, "Alice Johnson", "alice@example.com", "Java,Spring,MySQL", 90000.0};
    
    printf("Before swap:\n");
    printf("Dev1: %s (Salary: $%.2f)\n", dev1.name, dev1.salary);
    printf("Dev2: %s (Salary: $%.2f)\n", dev2.name, dev2.salary);
    
    swapDevelopers(&dev1, &dev2);
    
    printf("\nAfter swap:\n");
    printf("Dev1: %s (Salary: $%.2f)\n", dev1.name, dev1.salary);
    printf("Dev2: %s (Salary: $%.2f)\n", dev2.name, dev2.salary);
    
    // Pointer arithmetic
    int numbers[] = {10, 20, 30, 40, 50};
    int* ptr = numbers;
    
    printf("\nPointer arithmetic demonstration:\n");
    for (int i = 0; i < 5; i++) {
        printf("Address: %p, Value: %d\n", (void*)(ptr + i), *(ptr + i));
    }
}

// 11. Main Function - Demonstrating All Features
int main() {
    printf("=== C Programming Portfolio Demonstration ===\n");
    printf("Author: Bodheesh VC\n\n");
    
    // Create sample developers
    Developer developers[] = {
        {1, "Bodheesh VC", "bodheesh@example.com", "JavaScript,TypeScript,React,Node.js,MongoDB", 85000.0},
        {2, "Alice Johnson", "alice@example.com", "Java,Spring Boot,MySQL,AWS", 90000.0},
        {3, "Bob Smith", "bob@example.com", "Python,Django,PostgreSQL,Docker", 82000.0},
        {4, "Carol Davis", "carol@example.com", "C#,.NET,SQL Server,Azure", 88000.0}
    };
    
    int numDevelopers = sizeof(developers) / sizeof(developers[0]);
    
    // 1. Linked List Demonstration
    printf("1. LINKED LIST DEMONSTRATION\n");
    printf("================================\n");
    LinkedList* devList = createLinkedList();
    
    for (int i = 0; i < numDevelopers; i++) {
        insertDeveloper(devList, developers[i]);
    }
    
    displayDevelopers(devList);
    
    // Search for a developer
    Developer* found = findDeveloperById(devList, 1);
    if (found != NULL) {
        printf("Found developer: %s\n", found->name);
    }
    
    // 2. Dynamic Array Demonstration
    printf("\n2. DYNAMIC ARRAY DEMONSTRATION\n");
    printf("===============================\n");
    DynamicArray* devArray = createDynamicArray(2);
    
    for (int i = 0; i < numDevelopers; i++) {
        addDeveloper(devArray, developers[i]);
    }
    
    printf("Array size: %d, Capacity: %d\n", devArray->size, devArray->capacity);
    
    // Sort developers by salary
    sortDevelopersBySalary(devArray);
    
    printf("\nSorted developers by salary:\n");
    for (int i = 0; i < devArray->size; i++) {
        printf("%d. %s - $%.2f\n", i+1, devArray->developers[i].name, devArray->developers[i].salary);
    }
    
    // 3. Hash Table Demonstration
    printf("\n3. HASH TABLE DEMONSTRATION\n");
    printf("============================\n");
    HashTable* devHash = createHashTable();
    
    for (int i = 0; i < numDevelopers; i++) {
        hashInsert(devHash, developers[i].id, developers[i]);
    }
    
    // Search in hash table
    Developer* hashFound = hashSearch(devHash, 1);
    if (hashFound != NULL) {
        printf("Hash table search result: %s\n", hashFound->name);
    }
    
    // 4. String Processing Demonstration
    printf("\n4. STRING PROCESSING DEMONSTRATION\n");
    printf("===================================\n");
    char skillsString[] = "JavaScript, TypeScript, React, Node.js, MongoDB";
    char skillArray[10][50];
    int skillCount;
    
    char* skillsCopy = safeStringCopy(skillsString);
    processSkillString(skillsCopy, skillArray, &skillCount);
    
    printf("Extracted skills:\n");
    for (int i = 0; i < skillCount; i++) {
        printf("- %s\n", skillArray[i]);
    }
    free(skillsCopy);
    
    // 5. Pointer Demonstration
    demonstratePointers();
    
    // 6. File I/O Demonstration
    printf("\n6. FILE I/O DEMONSTRATION\n");
    printf("==========================\n");
    const char* filename = "developers.dat";
    
    saveDevelopersToFile(devArray, filename);
    
    DynamicArray* loadedArray = loadDevelopersFromFile(filename);
    if (loadedArray != NULL) {
        printf("Loaded %d developers from file.\n", loadedArray->size);
        freeDynamicArray(loadedArray);
    }
    
    // 7. Memory Analysis
    printf("\n7. MEMORY USAGE ANALYSIS\n");
    printf("=========================\n");
    printf("Size of Developer struct: %zu bytes\n", sizeof(Developer));
    printf("Size of Node struct: %zu bytes\n", sizeof(Node));
    printf("Size of LinkedList: %zu bytes\n", sizeof(LinkedList));
    printf("Size of DynamicArray: %zu bytes\n", sizeof(DynamicArray));
    printf("Total memory for %d developers in array: %zu bytes\n", 
           devArray->size, devArray->size * sizeof(Developer));
    
    // 8. Algorithm Performance Demo
    printf("\n8. ALGORITHM PERFORMANCE\n");
    printf("========================\n");
    
    // Binary search (assuming sorted array)
    int searchId = 2;
    bool found = false;
    for (int i = 0; i < devArray->size; i++) {
        if (devArray->developers[i].id == searchId) {
            printf("Linear search found developer at index %d\n", i);
            found = true;
            break;
        }
    }
    
    if (!found) {
        printf("Developer with ID %d not found\n", searchId);
    }
    
    // Cleanup memory
    freeDeveloperList(devList);
    freeDynamicArray(devArray);
    
    printf("\n=== Program completed successfully ===\n");
    printf("All memory has been properly freed.\n");
    
    return 0;
}

// 9. Additional Utility Functions

// Function to calculate statistics
typedef struct {
    float average;
    float min;
    float max;
    int count;
} SalaryStats;

SalaryStats calculateSalaryStats(DynamicArray* arr) {
    SalaryStats stats = {0.0, 0.0, 0.0, 0};
    
    if (arr->size == 0) return stats;
    
    stats.min = arr->developers[0].salary;
    stats.max = arr->developers[0].salary;
    float total = 0.0;
    
    for (int i = 0; i < arr->size; i++) {
        float salary = arr->developers[i].salary;
        total += salary;
        
        if (salary < stats.min) stats.min = salary;
        if (salary > stats.max) stats.max = salary;
    }
    
    stats.average = total / arr->size;
    stats.count = arr->size;
    
    return stats;
}

// Function pointer demonstration
typedef int (*CompareFunction)(const void* a, const void* b);

int compareBySalary(const void* a, const void* b) {
    Developer* devA = (Developer*)a;
    Developer* devB = (Developer*)b;
    
    if (devA->salary > devB->salary) return -1;
    if (devA->salary < devB->salary) return 1;
    return 0;
}

int compareByName(const void* a, const void* b) {
    Developer* devA = (Developer*)a;
    Developer* devB = (Developer*)b;
    return strcmp(devA->name, devB->name);
}

void sortDevelopers(DynamicArray* arr, CompareFunction compare) {
    qsort(arr->developers, arr->size, sizeof(Developer), compare);
}

// 10. Error Handling and Validation
bool validateDeveloper(const Developer* dev) {
    if (dev == NULL) return false;
    if (dev->id <= 0) return false;
    if (strlen(dev->name) == 0) return false;
    if (strlen(dev->email) == 0) return false;
    if (dev->salary < 0) return false;
    
    // Basic email validation
    if (strchr(dev->email, '@') == NULL) return false;
    
    return true;
}

int safeDeveloperInsert(LinkedList* list, Developer dev) {
    if (!validateDeveloper(&dev)) {
        printf("Error: Invalid developer data\n");
        return -1;
    }
    
    // Check for duplicate ID
    if (findDeveloperById(list, dev.id) != NULL) {
        printf("Error: Developer with ID %d already exists\n", dev.id);
        return -1;
    }
    
    insertDeveloper(list, dev);
    return 0;
}
