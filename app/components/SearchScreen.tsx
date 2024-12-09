import React, { useState } from "react";
import {
  View,
  TextInput,
  Button,
  FlatList,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

export function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);

  const handleSearch = () => {
    // Example: Simulated search results based on the query
    const mockResults = [
      "Result 1 for " + query,
      "Result 2 for " + query,
      "Result 3 for " + query,
    ];
    setResults(mockResults);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your search query"
          value={query}
          onChangeText={setQuery}
        />
        <Button title="Search" onPress={handleSearch} />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => <Text style={styles.result}>{item}</Text>}
        contentContainerStyle={styles.resultsContainer}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  searchContainer: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginRight: 8,
  },
  resultsContainer: {
    marginTop: 16,
  },
  result: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
});
